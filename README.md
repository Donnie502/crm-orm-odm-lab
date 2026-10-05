# CRM ORM/ODM Lab

API REST de un CRM básico que combina un ORM (Sequelize + PostgreSQL) y un ODM (Mongoose + MongoDB).

## Stack

- Node.js 22, Express 5, CommonJS
- Sequelize + PostgreSQL 16 (`User`, `Company`, `Contact`)
- Mongoose + MongoDB 7 (`Activity`)
- Jest + Supertest
- GitHub Codespaces, Dev Containers, Docker Compose
- Supervisor (`npm run dev`)

## Arquitectura

```text
GitHub Codespace
│
├── app       Node.js 22  ──┬── Sequelize ──> postgres (PostgreSQL)
│                           └── Mongoose  ──> mongo    (MongoDB)
├── postgres
└── mongo
```

La aplicación se conecta por nombre de servicio (`postgres`, `mongo`). Las credenciales de desarrollo llegan como variables de entorno definidas en `.devcontainer/docker-compose.yml` (ver `.env.example`).

## Iniciar el Codespace

1. En GitHub: **Code → Codespaces → Create codespace on main**.
2. Espera a que se levanten los tres servicios (`app`, `postgres`, `mongo`). `postCreateCommand` ejecuta `npm install`.

## Instalar dependencias

```bash
npm install
```

## Seed y reset

```bash
npm run seed    # inserta datos deterministas (3 users, 4 companies, 8 contacts, 10 activities)
npm run reset   # elimina y recrea tablas/base de datos y vuelve a sembrar
```

## Iniciar la API

```bash
npm start       # node ./bin/www
npm run dev     # supervisor ./bin/www
```

Servidor en el puerto `3000` (variable `PORT`).

## Pruebas

```bash
npm test
```

Cada suite restablece PostgreSQL y MongoDB antes de ejecutarse y cierra las conexiones al terminar.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/users` | Listar usuarios |
| GET | `/users/:id` | Obtener usuario |
| POST | `/users` | Crear usuario |
| PUT | `/users/:id` | Actualizar usuario |
| DELETE | `/users/:id` | Eliminar usuario |
| GET | `/companies` | Listar compañías (`?industry=`) |
| GET | `/companies/:id` | Obtener compañía |
| POST | `/companies` | Crear compañía |
| PUT | `/companies/:id` | Actualizar compañía |
| DELETE | `/companies/:id` | Eliminar compañía |
| GET | `/contacts` | Listar contactos |
| GET | `/contacts/:id` | Obtener contacto |
| POST | `/contacts` | Crear contacto |
| PUT | `/contacts/:id` | Actualizar contacto |
| DELETE | `/contacts/:id` | Eliminar contacto |
| GET | `/activities` | Listar actividades (`?type=`) |
| GET | `/activities/:id` | Obtener actividad |
| POST | `/activities` | Crear actividad |
| PUT | `/activities/:id` | Actualizar actividad |
| DELETE | `/activities/:id` | Eliminar actividad |

Los errores se devuelven como JSON: `{ "error": "Contact not found" }`.

## Respuestas

### Arquitectura

**1. Dos motores.** Considero que `Company` y `Contact` van en una base relacional porque tienen una estructura fija y están relacionadas: una compañía tiene varios contactos, y con las llaves foráneas la propia base de datos cuida que esa relación sea válida. `Activity`, en cambio, tiene un campo `metadata` que cambia según el tipo de actividad (una llamada guarda la duración y el resultado, un correo guarda el asunto y si fue abierto). En una tabla eso dejaría muchas columnas vacías, por eso encaja mejor como documento en MongoDB.

**2. ORM vs ODM.** Un ORM convierte las tablas de una base relacional en objetos para poder usarlas desde el código sin escribir SQL, y un ODM hace lo mismo con los documentos de una base como MongoDB. La diferencia es que el ORM trabaja con tablas, columnas y relaciones, mientras que el ODM trabaja con colecciones y documentos que pueden traer datos anidados. En esta práctica usamos Sequelize como ORM con PostgreSQL y Mongoose como ODM con MongoDB.

**3. Variables de entorno.** En Codespaces, `DB_HOST` apunta al servicio `postgres` y `MONGODB_URI` apunta a `mongodb://mongo:27017/crm`. Los dos valores se definen en `.devcontainer/docker-compose.yml` y el código los lee con `process.env`, por ejemplo en `config/sequelize.js`. Es mala práctica poner las credenciales directo en el JavaScript porque quedan visibles en el repositorio y en el historial de Git, y además habría que cambiar el código cada vez que cambie el entorno.

### Sequelize y PostgreSQL

**4. Asociaciones.** La relación entre `Company` y `Contact` es de uno a muchos. En `models/sequelize/index.js` se define con `Company.hasMany(Contact, { foreignKey: 'companyId', as: 'contacts' })`, así que la llave foránea `companyId` está en la tabla de contactos y apunta a la tabla de compañías. El alias `as: 'contacts'` es el nombre con el que se accede a los contactos de una compañía, y es el mismo que hay que poner en el `include` del reto 05. También tiene `onDelete: 'CASCADE'`, entonces si se borra una compañía se borran sus contactos.

**5. Eager Loading.** Sin `include` tendría que hacer dos consultas: una con `findByPk` para la compañía y otra con `Contact.findAll` para sus contactos, y luego juntar los resultados yo mismo. Con `include` Sequelize lo resuelve en una sola consulta con un join y regresa la compañía con su arreglo `contacts` ya armado, que sale vacío si no tiene contactos. Es más cómodo y hace menos consultas a la base de datos.

**6. Instancia vs consulta directa.** Con `contact.update()` primero busco el contacto con `findByPk`, así puedo regresar el 404 si no existe, y después aplico solo los cambios que llegan en `req.body`, por lo que los demás campos se quedan igual. Además al final ya tengo la instancia actualizada para responderla. `Contact.update()` actúa directo sobre la tabla con un `where` y solo regresa cuántas filas cambió, entonces habría que hacer otra consulta para obtener el contacto actualizado.

### Mongoose y MongoDB

**7. Esquema flexible.** Para `metadata` se usó el tipo `mongoose.Schema.Types.Mixed`, con `{}` como valor por defecto. La ventaja es que acepta cualquier estructura, así que sirve para los tres tipos de actividad sin cambiar el modelo. La desventaja es que Mongoose no revisa lo que contiene, entonces se pueden guardar datos mal formados o inconsistentes, y si se modifica algo dentro del objeto hay que avisarle con `markModified`.

**8. Sin `ref`.** `contactId` y `userId` son números porque vienen de PostgreSQL, y `ref` con `populate` solo funciona entre colecciones de MongoDB que usan `ObjectId`. Por eso MongoDB no puede comprobar que esos IDs existan en la otra base. La integridad referencial queda a cargo de la aplicación: si se borra un contacto en PostgreSQL, sus actividades siguen en MongoDB porque el `CASCADE` no llega hasta allá.

**9. Documento actualizado.** Por defecto `findByIdAndUpdate` regresa el documento como estaba antes de actualizarlo, que es el mismo comportamiento que tiene `findOneAndUpdate` en MongoDB. Para que regrese el documento ya modificado hay que pasar la opción `{ new: true }`. En el reto 08 también agregué `runValidators: true`, porque Mongoose no aplica las validaciones del esquema en las actualizaciones si no se activa.

### Pruebas y proceso

**10. Pruebas de comportamiento.** Las pruebas hacen peticiones HTTP con Supertest y revisan el código de estado y el JSON que regresa la API, o sea lo mismo que recibiría un cliente real. Lo bueno es que no importa cómo se escribió el código por dentro: si el resultado es correcto la prueba pasa, y se puede cambiar la implementación sin romper las pruebas.

**11. Repetibilidad.** El archivo `tests/setup.js` conecta las dos bases de datos antes de cada suite y llama a `reset()` de los seeders, que deja otra vez los datos iniciales (3 usuarios, 4 compañías, 8 contactos y 10 actividades). Al terminar cierra las conexiones. Gracias a eso cada suite empieza siempre con los mismos datos, y los resultados esperados, como los 8 contactos, no dependen de lo que hicieron las pruebas anteriores.

**12. Experiencia personal.** El reto que más se me complicó fue el 08, porque el código original parecía estar bien: la petición regresaba 200, pero el documento de la respuesta era el anterior a la actualización. Para encontrar el problema revisé cómo funciona `findByIdAndUpdate` y leí lo que pedía `challenge08.test.js`, y vi que por defecto regresa el documento viejo. Lo arreglé con `new: true` y `runValidators: true`, corrí `npx jest tests/challenge08.test.js` hasta que pasó y al final corrí `npm test` para confirmar que no se hubiera roto otro reto.
