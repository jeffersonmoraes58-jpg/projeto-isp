-- AlterTable
ALTER TABLE "cto_portas" ADD COLUMN "contratoId" TEXT;

-- CreateTable
CREATE TABLE "contratos" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "apelido" TEXT,
    "usuarioPppoe" TEXT NOT NULL,
    "senhaPppoe" TEXT NOT NULL,
    "statusPppoe" "StatusPppoe" NOT NULL DEFAULT 'ATIVO',
    "ipFixo" TEXT,
    "serialOnu" TEXT,
    "macOnu" TEXT,
    "modeloOnu" TEXT,
    "sinalOnu" DECIMAL(6,2),
    "statusOnu" "StatusOnu" NOT NULL DEFAULT 'OFFLINE',
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" CHAR(2),
    "cep" TEXT,
    "planoId" TEXT,
    "diaVencimento" INTEGER NOT NULL DEFAULT 10,
    "statusFinanceiro" "StatusFinanceiro" NOT NULL DEFAULT 'EM_DIA',
    "dataAtivacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contratos_usuarioPppoe_key" ON "contratos"("usuarioPppoe");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_serialOnu_key" ON "contratos"("serialOnu");

-- CreateIndex
CREATE UNIQUE INDEX "cto_portas_contratoId_key" ON "cto_portas"("contratoId");

-- AddForeignKey
ALTER TABLE "cto_portas" ADD CONSTRAINT "cto_portas_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
