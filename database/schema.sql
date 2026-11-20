/* =====================================================================
   Proyecto EYS - Script de creación de tablas (Azure SQL)
   Las tablas viven en el esquema EYS dentro de la base de datos existente.
   Re-ejecutable: solo crea lo que no existe.
   ===================================================================== */

/* ---------- Esquema ---------- */
IF SCHEMA_ID(N'EYS') IS NULL
    EXEC (N'CREATE SCHEMA EYS AUTHORIZATION dbo');
GO

/* ---------- Usuarios internos ---------- */
IF OBJECT_ID(N'EYS.Usuarios', N'U') IS NULL
BEGIN
    CREATE TABLE EYS.Usuarios (
        Id            INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_EYS_Usuarios PRIMARY KEY,
        Usuario       NVARCHAR(50)  NOT NULL CONSTRAINT UQ_EYS_Usuarios_Usuario UNIQUE,
        PasswordHash  NVARCHAR(200) NOT NULL,
        Nombre        NVARCHAR(150) NOT NULL,
        Activo        BIT           NOT NULL CONSTRAINT DF_EYS_Usuarios_Activo DEFAULT (1),
        CreadoEn      DATETIME2     NOT NULL CONSTRAINT DF_EYS_Usuarios_CreadoEn DEFAULT (SYSUTCDATETIME())
    );
END
GO

/* ---------- Personas ---------- */
IF OBJECT_ID(N'EYS.Personas', N'U') IS NULL
BEGIN
    CREATE TABLE EYS.Personas (
        Id                INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_EYS_Personas PRIMARY KEY,
        DNI               CHAR(8)       NOT NULL CONSTRAINT UQ_EYS_Personas_DNI UNIQUE,
        NombresApellidos  NVARCHAR(200) NOT NULL,
        FechaNacimiento   DATE          NOT NULL,
        LugarNacimiento   NVARCHAR(150) NOT NULL,
        Telefono          NVARCHAR(20)  NULL,
        Direccion         NVARCHAR(250) NULL,
        Bautizado         BIT           NOT NULL CONSTRAINT DF_EYS_Personas_Bautizado DEFAULT (0),
        FechaBautismo     DATE          NULL,
        Origen            NVARCHAR(10)  NOT NULL,
        CreadoPor         INT           NULL,
        CreadoEn          DATETIME2     NOT NULL CONSTRAINT DF_EYS_Personas_CreadoEn DEFAULT (SYSUTCDATETIME()),
        ActualizadoEn     DATETIME2     NULL,

        CONSTRAINT CK_EYS_Personas_DNI
            CHECK (DNI NOT LIKE '%[^0-9]%' AND LEN(DNI) = 8),
        CONSTRAINT CK_EYS_Personas_Bautismo
            CHECK (Bautizado = 1 OR FechaBautismo IS NULL),
        CONSTRAINT CK_EYS_Personas_Origen
            CHECK (Origen IN (N'publico', N'interno')),
        CONSTRAINT FK_EYS_Personas_CreadoPor
            FOREIGN KEY (CreadoPor) REFERENCES EYS.Usuarios (Id)
    );
END
GO

/* Índice para búsquedas por nombre en el listado */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_EYS_Personas_NombresApellidos'
               AND object_id = OBJECT_ID(N'EYS.Personas'))
BEGIN
    CREATE INDEX IX_EYS_Personas_NombresApellidos ON EYS.Personas (NombresApellidos);
END
GO
