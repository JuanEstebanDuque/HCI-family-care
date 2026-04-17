# Guía de Pruebas de Conexión (MongoDB CRUD)

Este módulo de pruebas (`TestModule`) fue creado estrictamente para verificar la salud de la conexión entre el servidor NestJS y la base de datos MongoDB Atlas en la nube, antes de involucrar cualquier hardware.

Para ejecutar cualquiera de las siguientes pruebas, asegúrate de que tu servidor esté corriendo localmente mediante el comando:
```bash
npm run start:dev
```
Puedes usar herramientas como **Postman**, **Insomnia** o **Thunder Client** (Extensión de VSCode) para lanzar estas peticiones.

---

## 1. CREATE (Añadir un nuevo registro)
*Crea un nuevo documento de prueba en Atlas.*

- **URL:** `http://localhost:3000/test/create`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**
  ```json
  {
    "message": "Hola, esto es una prueba inicial."
  }
  ```

**✅ Respuesta Esperada (201 Created):**
```json
{
  "message": "Hola, esto es una prueba inicial.",
  "_id": "64d0f7a9e3a3f5b2c9d11111", 
  "createdAt": "2026-04-17T20:00:00.000Z",
  "updatedAt": "2026-04-17T20:00:00.000Z",
  "__v": 0
}
```
*(⚠️ Guarda mentalmente el `_id` de esta respuesta para hacer las pruebas de Update y Delete).*

---

## 2. READ (Leer todos los registros)
*Devuelve un array con absolutamente todo lo que hay en la colección de Tests.*

- **URL:** `http://localhost:3000/test`
- **Method:** `GET`
- **Body:** *(Vacío)*

**✅ Respuesta Esperada (200 OK):**
```json
[
  {
    "_id": "64d0f7a9e3a3f5b2c9d11111",
    "message": "Hola, esto es una prueba inicial.",
    "createdAt": "2026-04-17T20:00:00.000Z",
    "updatedAt": "2026-04-17T20:00:00.000Z",
    "__v": 0
  }
]
```

---

## 3. UPDATE (Editar un registro específico)
*Actualiza el mensaje de un documento basándose en su ID.*

- **URL:** `http://localhost:3000/test/update/<PEGA_EL_ID_AQUI>`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**
  ```json
  {
    "message": "El mensaje ha sido editado exitosamente."
  }
  ```

**✅ Respuesta Esperada (200 OK):**
```json
{
  "_id": "64d0f7a9e3a3f5b2c9d11111",
  "message": "El mensaje ha sido editado exitosamente.",
  "createdAt": "2026-04-17T20:00:00.000Z",
  "updatedAt": "2026-04-17T20:15:00.000Z",
  "__v": 0
}
```
*(Nota cómo el `updatedAt` cambió automáticamente, indicando que Mongoose registró la actualización).*

---

## 4. DELETE (Borrar un registro específico)
*Elimina permanentemente un documento de Atlas.*

- **URL:** `http://localhost:3000/test/delete/<PEGA_EL_ID_AQUI>`
- **Method:** `DELETE`
- **Body:** *(Vacío)*

**✅ Respuesta Esperada (200 OK):**
Devuelve el JSON del objeto que acaba de ser destruido. Si luego vuelves a ejecutar la prueba `GET` (Paso 2), verás que el Array `[]` regresará completamente vacío.
