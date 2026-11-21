# TASK-009 · Fuentes y cobertura

Puntos de entrada oficiales comprobados el 21 de noviembre de 2026. Las colecciones de `apps/api/src/research/sources.ts` se pueden editar por tema. El buscador web recibe los dominios, los enlaces oficiales y sus propósitos. El flujo de documentos usa la colección del mismo tema. Para temas sin colección se aplica la búsqueda oficial general.

| Tema y fuente | Cobertura y límites |
| --- | --- |
| Vivienda · [Incasòl, Generalitat de Catalunya](https://analisi.transparenciacatalunya.cat/api/views/qww9-bvhh) | Renta media mensual en EUR y contratos del registro de fianzas. Comparar el mismo municipio, periodo y tramo de precios. En Barcelona el código es `08019`. Una renta vacía es un valor ausente. |
| Vivienda · [INE, tabla 59061](https://www.ine.es/jaxiT3/Tabla.htm?t=59061) | Índices de precios del alquiler por serie y año. Conservar códigos de unidad y escala de la serie. Un índice no expresa renta media en euros. Los valores nulos o secretos quedan sin valor utilizable. |
| Turismo · [Open Data BCN, registro de viviendas turísticas](https://opendata-ajuntament.barcelona.cat/data/api/3/action/package_show?id=habitatges-us-turistic) | Contar expedientes distintos o sumar plazas, según la afirmación, por distrito o barrio. Conservar ceros iniciales. Una descarga indica la versión observada del registro. Para una cifra histórica hace falta una versión de esa fecha. |
| Población · [Open Data BCN, padrón](https://opendata-ajuntament.barcelona.cat/data/api/3/action/package_show?id=pad_mdbas) | Habitantes por sección censal a 1 de enero. Sumar solo filas de esa fecha y del ámbito consultado. Si falta un valor requerido, el agregado queda incompleto. |
| Decisiones y gasto · [Consell Municipal](https://ajuntament.barcelona.cat/ca/accio-de-govern/el-consell-municipal) | La portada enlaza agendas, decisiones y actas. El corpus consultable cubre esa portada y el [acta del 31 de octubre de 2025](https://ajuntament.barcelona.cat/sites/default/files/2025-12/CPlenari%2031-10-25-Acta.pdf). La aprobación o el reconocimiento de crédito no acredita el pago. |
| General · [BOE](https://www.boe.es/) | Publicación y legislación oficial. Para temas sin colección se consulta la web oficial y se conserva la procedencia de cada hallazgo. |

## Comprobaciones de referencia

- Turismo: 845 expedientes distintos en Ciutat Vella (`01`), comprobados con el registro guardado. El flujo del Worker desplegado terminó Supported en `31b53de8-c499-42e2-be76-b68b92bd2da1`.
- Gasto: el acta registra la aprobación por unanimidad del reconocimiento de crédito por 1.040 € del expediente `25XF0640`. El Worker desplegado citó la página 8 y terminó Supported en `e7e4c6c5-cf4e-42a6-9c1b-72cddfe4331c`.
- Vivienda: las filas de abril–junio de 2025 y 2026 del tramo de más de 600 €/mes dan 1.135,55 y 1.140,89 €/mes, un aumento del 0,47 %. El despliegue recuperó ambas filas en `0632e196-fd34-47ac-8205-ccf8bd677b2d`, pero falló al reformular la explicación del cálculo. La regresión queda cubierta en pruebas locales. Queda repetir el caso con la corrección desplegada.
- Controles de las otras series: el endpoint desplegado sumó 115.829 habitantes en Ciutat Vella a 1 de enero de 2026 (54 filas) y devolvió 118,727 y 122,92 para la serie de índice nacional `IPVA4962` en 2023 y 2024, respectivamente, conservando los códigos de unidad y escala.

## Comprobación integrada posterior

El caso de vivienda se repitió con éxito en el despliegue integrado: `32f5b2c7-32c2-4bcf-8f28-b9b8a41b5c28` terminó sin errores, Supported para 0,47% y Contradicted para 50%, con las mismas filas y cálculo. El extracto auténtico de crédito `092214d8-d963-4756-b1ac-5fd674513fe4` terminó con cuatro Supported y sin errores. El control de pago efectivo `c003a1c7-bfaa-4543-a741-ba002cd3501c` terminó Insufficient evidence.
