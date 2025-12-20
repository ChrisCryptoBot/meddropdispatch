// Equipment items master list
// These are the items drivers can check off during onboarding

export interface EquipmentItem {
  id: string
  name: string
  description: string
  isRequired: boolean
  category: 'VEHICLE' | 'TEMPERATURE' | 'DOCUMENTATION' | 'SAFETY' | 'OTHER'
}

export const EQUIPMENT_ITEMS: EquipmentItem[] = [
  // Vehicle Equipment
  {
    id: 'refrigerated_vehicle',
    name: 'Refrigerated Vehicle',
    description: 'Vehicle with active refrigeration system',
    isRequired: false,
    category: 'VEHICLE',
  },
  {
    id: 'temperature_monitor',
    name: 'Temperature Monitor/Logger',
    description: 'Device to monitor and log temperature during transport',
    isRequired: true,
    category: 'TEMPERATURE',
  },
  {
    id: 'cooler_containers',
    name: 'Cooler Containers',
    description: 'Insulated containers for temperature-sensitive items',
    isRequired: false,
    category: 'TEMPERATURE',
  },
  {
    id: 'ice_packs',
    name: 'Ice Packs',
    description: 'Reusable ice packs for temperature control',
    isRequired: false,
    category: 'TEMPERATURE',
  },
  {
    id: 'chain_of_custody_forms',
    name: 'Chain of Custody Forms',
    description: 'Physical or digital forms for tracking custody',
    isRequired: true,
    category: 'DOCUMENTATION',
  },
  {
    id: 'digital_signature_device',
    name: 'Digital Signature Device',
    description: 'Tablet or device for capturing digital signatures',
    isRequired: true,
    category: 'DOCUMENTATION',
  },
  {
    id: 'camera_phone',
    name: 'Camera Phone',
    description: 'Smartphone with camera for document photos',
    isRequired: true,
    category: 'DOCUMENTATION',
  },
  {
    id: 'gps_tracking_device',
    name: 'GPS Tracking Device',
    description: 'Device or app for real-time location tracking',
    isRequired: false,
    category: 'SAFETY',
  },
  {
    id: 'first_aid_kit',
    name: 'First Aid Kit',
    description: 'Basic first aid supplies',
    isRequired: false,
    category: 'SAFETY',
  },
  {
    id: 'emergency_contact_list',
    name: 'Emergency Contact List',
    description: 'List of emergency contacts and procedures',
    isRequired: false,
    category: 'SAFETY',
  },
  {
    id: 'un3373_labels',
    name: 'UN3373 Labels',
    description: 'Proper labels for biological substance transport',
    isRequired: false,
    category: 'DOCUMENTATION',
  },
  {
    id: 'specimen_containers',
    name: 'Specimen Containers',
    description: 'Proper containers for specimen transport',
    isRequired: false,
    category: 'OTHER',
  },
  {
    id: 'hand_sanitizer',
    name: 'Hand Sanitizer',
    description: 'Hand sanitizer for hygiene',
    isRequired: false,
    category: 'SAFETY',
  },
  {
    id: 'disposable_gloves',
    name: 'Disposable Gloves',
    description: 'Gloves for handling specimens',
    isRequired: false,
    category: 'SAFETY',
  },
]

// Get required items only
export function getRequiredItems(): EquipmentItem[] {
  return EQUIPMENT_ITEMS.filter(item => item.isRequired)
}

// Get items by category
export function getItemsByCategory(category: EquipmentItem['category']): EquipmentItem[] {
  return EQUIPMENT_ITEMS.filter(item => item.category === category)
}

// Get item by ID
export function getItemById(id: string): EquipmentItem | undefined {
  return EQUIPMENT_ITEMS.find(item => item.id === id)
}

