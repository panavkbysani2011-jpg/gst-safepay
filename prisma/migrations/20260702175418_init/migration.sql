-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "gstin" TEXT NOT NULL,
    "gstinActive" BOOLEAN NOT NULL DEFAULT true,
    "udyamRegistered" BOOLEAN NOT NULL DEFAULT false,
    "udyamCategory" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "invoiceAcceptanceDate" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "hasWrittenAgreement" BOOLEAN NOT NULL DEFAULT true,
    "agreedPaymentDays" INTEGER,
    "paidDate" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Bill_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Bill_vendorId_idx" ON "Bill"("vendorId");
