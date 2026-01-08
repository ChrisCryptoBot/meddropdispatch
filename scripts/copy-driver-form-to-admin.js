const fs = require('fs');
const path = require('path');

const driverFile = fs.readFileSync(path.join(__dirname, '../app/driver/manual-load/page.tsx'), 'utf8');

let adminContent = driverFile
  // Replace component names
  .replace(/DriverManualLoadPageContent/g, 'AdminCreateLoadPageContent')
  .replace(/DriverManualLoadPage/g, 'AdminCreateLoadPage')
  
  // Replace routes
  .replace(/driver\/dashboard/g, 'admin/loads')
  .replace(/driver\/loads\//g, 'admin/loads/')
  .replace(/driver\/documents/g, 'admin/loads')
  
  // Replace createdVia
  .replace(/createdVia: 'DRIVER_MANUAL'/g, "createdVia: 'INTERNAL'")
  
  // Replace API endpoints
  .replace(/\/api\/load-requests\/driver-manual/g, '/api/load-requests')
  
  // Replace driver references with admin
  .replace(/const \[driver/g, 'const [admin')
  .replace(/setDriver/g, 'setAdmin')
  .replace(/driver\?/g, 'admin?')
  .replace(/driver &&/g, 'admin &&')
  .replace(/if \(!driver\)/g, 'if (!admin)')
  .replace(/fetchDriverData/g, 'fetchAdminData')
  .replace(/authData\.userType !== 'driver'/g, "authData.userType !== 'admin'")
  .replace(/data\.userType !== 'driver'/g, "data.user?.userType !== 'admin'")
  
  // Replace UI text
  .replace(/Record Manual Load/g, 'Create Load Request')
  .replace(/top-\[100px\]/g, 'top-[85px]')
  
  // Remove driverId requirement (admin doesn't need it)
  .replace(/driverId: driver\.id,/g, '// driverId not needed for admin')
  .replace(/driverId: data\.user\.id,/g, '// driverId not needed for admin')
  
  // Remove draft functionality (not needed for admin)
  .replace(/const \[draftId, setDraftId\] = useState<string \| null>\(null\)/g, '')
  .replace(/const \[isSavingDraft, setIsSavingDraft\] = useState\(false\)/g, '')
  .replace(/const \[lastSavedAt, setLastSavedAt\] = useState<Date \| null>\(null\)/g, '')
  .replace(/loadMostRecentDraft/g, '// Draft loading removed for admin')
  .replace(/saveDraft/g, '// Draft saving removed for admin')
  .replace(/deleteDraft/g, '// Draft deletion removed for admin')
  .replace(/Auto-save draft every 30 seconds[\s\S]*?}, \[driver, formData/g, '// Draft auto-save removed for admin\n  }, [admin, formData')
  .replace(/autoSaveInterval/g, '// Removed for admin')
  
  // Update workflow banner colors for admin
  .replace(/bg-blue-50 border border-blue-200/g, 'bg-blue-500/10 border border-blue-500/30')
  .replace(/text-blue-600/g, 'text-blue-400')
  .replace(/text-blue-900/g, 'text-blue-300')
  .replace(/text-blue-800/g, 'text-slate-300')

fs.writeFileSync(path.join(__dirname, '../app/admin/loads/create/page.tsx'), adminContent);
console.log('Admin create load form created successfully!');
