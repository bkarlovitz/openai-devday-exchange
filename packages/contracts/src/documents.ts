import { Schema } from "effect";
import { SnapshotId } from "./database";

const DatasetId = Schema.String.pipe(Schema.pattern(/^[a-z0-9][a-z0-9-]{0,79}$/));
const PassageNumber = Schema.Int.pipe(Schema.between(1, 2147483647));

export const SearchDocumentsInput = Schema.Struct({
  query: Schema.String.pipe(
    Schema.maxLength(200),
    Schema.filter((query) => query.trim().length > 0),
  ),
  datasetId: Schema.optional(DatasetId),
  snapshotId: Schema.optional(SnapshotId),
  limit: Schema.optional(Schema.Int.pipe(Schema.between(1, 20))),
});
export type SearchDocumentsInput = typeof SearchDocumentsInput.Type;

export const ReadDocumentPassageInput = Schema.Struct({
  snapshotId: SnapshotId,
  passageNumber: PassageNumber,
});
export type ReadDocumentPassageInput = typeof ReadDocumentPassageInput.Type;

export type DocumentPassage = {
  datasetId: string;
  snapshotId: string;
  passageNumber: number;
  pageNumber: number | null;
  htmlLocation: string | null;
  sourceUrl: string;
  sha256: string;
  extractionVersion: string;
  text: string;
};
