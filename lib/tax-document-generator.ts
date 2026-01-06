/**
 * Tax Document Generator
 * Generates 1099 tax forms for drivers based on their earnings
 */

import { prisma } from './prisma'

export interface TaxYearEarnings {
  driverId: string
  taxYear: number
  totalEarnings: number
  loadCount: number
  loads: Array<{
    id: string
    publicTrackingCode: string
    quoteAmount: number
    actualDeliveryTime: Date
    shipperCompanyName: string
  }>
}

export interface Form1099Data {
  // Payer Information (MED DROP)
  payerName: string
  payerAddress: string
  payerCity: string
  payerState: string
  payerZip: string
  payerTin: string // Company EIN
  
  // Recipient Information (Driver)
  recipientName: string
  recipientAddress: string
  recipientCity: string
  recipientState: string
  recipientZip: string
  recipientTin: string // Driver SSN or EIN
  recipientTinType: 'SSN' | 'EIN'
  
  // Tax Year
  taxYear: number
  
  // Earnings
  totalEarnings: number
  loadCount: number
  
  // Load Details
  loads: Array<{
    trackingCode: string
    amount: number
    deliveryDate: Date
    shipper: string
  }>
}

/**
 * Calculate driver earnings for a specific tax year
 */
export async function calculateTaxYearEarnings(
  driverId: string,
  taxYear: number
): Promise<TaxYearEarnings> {
  const yearStart = new Date(taxYear, 0, 1) // January 1
  const yearEnd = new Date(taxYear, 11, 31, 23, 59, 59) // December 31

  // Get all completed loads for this driver in the tax year
  const loads = await prisma.loadRequest.findMany({
    where: {
      driverId: driverId,
      status: 'DELIVERED',
      actualDeliveryTime: {
        gte: yearStart,
        lte: yearEnd,
      },
      quoteAmount: {
        not: null,
      },
    },
    include: {
      shipper: {
        select: {
          companyName: true,
        },
      },
    },
    orderBy: {
      actualDeliveryTime: 'asc',
    },
  })

  const totalEarnings = loads.reduce(
    (sum, load) => sum + (load.quoteAmount || 0),
    0
  )

  return {
    driverId,
    taxYear,
    totalEarnings,
    loadCount: loads.length,
    loads: loads.map((load) => ({
      id: load.id,
      publicTrackingCode: load.publicTrackingCode,
      quoteAmount: load.quoteAmount || 0,
      actualDeliveryTime: load.actualDeliveryTime!,
      shipperCompanyName: load.shipper.companyName,
    })),
  }
}

/**
 * Generate Form 1099 data for a driver
 */
export async function generateForm1099Data(
  driverId: string,
  taxYear: number
): Promise<Form1099Data | null> {
  // Get driver information
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  })

  if (!driver) {
    return null
  }

  // Note: Driver model doesn't have taxId/taxIdType fields
  // These would need to be added to the schema or retrieved from another source
  const driverTaxId = '' // TODO: Get from driver payment settings or related model
  const driverTaxIdType: 'SSN' | 'EIN' = 'SSN' // Default to SSN
  
  if (!driverTaxId) {
    throw new Error('Driver tax information is missing. Please update payment settings.')
  }

  // Calculate earnings
  const earnings = await calculateTaxYearEarnings(driverId, taxYear)

  if (earnings.totalEarnings === 0) {
    throw new Error(`No earnings found for tax year ${taxYear}`)
  }

  // Payer information (MED DROP company info)
  // TODO: Move this to environment variables or company settings
  const payerInfo = {
    name: process.env.COMPANY_NAME || 'MED DROP',
    address: process.env.COMPANY_ADDRESS || '123 Medical Courier Way',
    city: process.env.COMPANY_CITY || 'City',
    state: process.env.COMPANY_STATE || 'ST',
    zip: process.env.COMPANY_ZIP || '12345',
    tin: process.env.COMPANY_EIN || '12-3456789', // Company EIN
  }

  // Recipient information (Driver)
  // Note: Driver model doesn't have address fields - using defaults
  const recipientAddress = 'Address not provided'

  return {
    payerName: payerInfo.name,
    payerAddress: payerInfo.address,
    payerCity: payerInfo.city,
    payerState: payerInfo.state,
    payerZip: payerInfo.zip,
    payerTin: payerInfo.tin,
    
    recipientName: `${driver.firstName} ${driver.lastName}`,
    recipientAddress: recipientAddress,
    recipientCity: '',
    recipientState: '',
    recipientZip: '',
    recipientTin: driverTaxId,
    recipientTinType: driverTaxIdType,
    
    taxYear,
    totalEarnings: earnings.totalEarnings,
    loadCount: earnings.loadCount,
    loads: earnings.loads.map((load) => ({
      trackingCode: load.publicTrackingCode,
      amount: load.quoteAmount,
      deliveryDate: load.actualDeliveryTime,
      shipper: load.shipperCompanyName,
    })),
  }
}

/**
 * Generate HTML template for Form 1099
 */
export function generateForm1099HTML(data: Form1099Data): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Form 1099-NEC - ${data.taxYear}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 10pt;
      margin: 0;
      padding: 20px;
      color: #000;
    }
    .form-container {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid #000;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .form-title {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .form-subtitle {
      font-size: 10pt;
      margin-bottom: 10px;
    }
    .section {
      margin-bottom: 15px;
      border: 1px solid #ccc;
      padding: 10px;
    }
    .section-title {
      font-weight: bold;
      font-size: 11pt;
      margin-bottom: 10px;
      border-bottom: 1px solid #000;
      padding-bottom: 5px;
    }
    .row {
      display: flex;
      margin-bottom: 8px;
    }
    .label {
      font-weight: bold;
      width: 150px;
      flex-shrink: 0;
    }
    .value {
      flex: 1;
    }
    .earnings-summary {
      background-color: #f5f5f5;
      padding: 15px;
      margin: 15px 0;
      border: 2px solid #000;
    }
    .earnings-amount {
      font-size: 18pt;
      font-weight: bold;
      text-align: center;
      margin: 10px 0;
    }
    .loads-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 9pt;
    }
    .loads-table th,
    .loads-table td {
      border: 1px solid #ccc;
      padding: 5px;
      text-align: left;
    }
    .loads-table th {
      background-color: #e0e0e0;
      font-weight: bold;
    }
    .footer {
      margin-top: 30px;
      font-size: 8pt;
      text-align: center;
      color: #666;
    }
    @media print {
      body {
        padding: 0;
      }
      .form-container {
        border: none;
      }
    }
  </style>
</head>
<body>
  <div class="form-container">
    <div class="header">
      <div class="form-title">Form 1099-NEC</div>
      <div class="form-subtitle">Nonemployee Compensation</div>
      <div class="form-subtitle">Tax Year: ${data.taxYear}</div>
    </div>

    <div class="section">
      <div class="section-title">Payer Information</div>
      <div class="row">
        <div class="label">Name:</div>
        <div class="value">${data.payerName}</div>
      </div>
      <div class="row">
        <div class="label">Address:</div>
        <div class="value">${data.payerAddress}</div>
      </div>
      <div class="row">
        <div class="label">City, State ZIP:</div>
        <div class="value">${data.payerCity}, ${data.payerState} ${data.payerZip}</div>
      </div>
      <div class="row">
        <div class="label">TIN (EIN):</div>
        <div class="value">${data.payerTin}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Recipient Information</div>
      <div class="row">
        <div class="label">Name:</div>
        <div class="value">${data.recipientName}</div>
      </div>
      <div class="row">
        <div class="label">Address:</div>
        <div class="value">${data.recipientAddress}</div>
      </div>
      <div class="row">
        <div class="label">City, State ZIP:</div>
        <div class="value">${data.recipientCity}, ${data.recipientState} ${data.recipientZip}</div>
      </div>
      <div class="row">
        <div class="label">TIN (${data.recipientTinType}):</div>
        <div class="value">${data.recipientTin}</div>
      </div>
    </div>

    <div class="earnings-summary">
      <div style="text-align: center; font-weight: bold; margin-bottom: 10px;">
        Total Nonemployee Compensation
      </div>
      <div class="earnings-amount">
        ${formatCurrency(data.totalEarnings)}
      </div>
      <div style="text-align: center; font-size: 9pt; color: #666;">
        Based on ${data.loadCount} completed load${data.loadCount !== 1 ? 's' : ''}
      </div>
    </div>

    ${data.loads.length > 0 ? `
    <div class="section">
      <div class="section-title">Load Details</div>
      <table class="loads-table">
        <thead>
          <tr>
            <th>Tracking Code</th>
            <th>Shipper</th>
            <th>Delivery Date</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${data.loads.map(load => `
            <tr>
              <td>${load.trackingCode}</td>
              <td>${load.shipper}</td>
              <td>${formatDate(load.deliveryDate)}</td>
              <td>${formatCurrency(load.amount)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="font-weight: bold; background-color: #f0f0f0;">
            <td colspan="3" style="text-align: right;">Total:</td>
            <td>${formatCurrency(data.totalEarnings)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    ` : ''}

    <div class="footer">
      <p>This form is generated by MED DROP for tax reporting purposes.</p>
      <p>Please consult with a tax professional for questions regarding this form.</p>
      <p>Generated on: ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

