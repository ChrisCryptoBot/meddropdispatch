'use client'

interface DocumentViewButtonProps {
  url: string
  title?: string
  className?: string
  children?: React.ReactNode
}

/**
 * Button component for viewing documents
 * Handles data URLs by converting them to blob URLs (browsers block data URLs in top frame)
 */
export default function DocumentViewButton({ 
  url, 
  title, 
  className = "px-3 py-1 rounded-lg text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer",
  children = "View"
}: DocumentViewButtonProps) {
  const handleClick = () => {
    if (url.startsWith('data:')) {
      // Convert data URL to blob URL for opening
      try {
        const [mimeType, base64Data] = url.split(',')
        const mimeMatch = mimeType.match(/data:([^;]+)/)
        const actualMimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
        
        // Decode base64
        const binaryString = atob(base64Data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        
        // Create blob and blob URL
        const blob = new Blob([bytes], { type: actualMimeType })
        const blobUrl = URL.createObjectURL(blob)
        
        // Open in new window
        const newWindow = window.open(blobUrl, '_blank')
        
        // Clean up blob URL after a delay
        if (newWindow) {
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl)
          }, 1000)
        } else {
          // If popup blocked, try download instead
          const link = document.createElement('a')
          link.href = blobUrl
          link.download = title || 'document'
          if (actualMimeType === 'application/pdf') {
            link.download += '.pdf'
          } else if (actualMimeType.startsWith('image/')) {
            const ext = actualMimeType.split('/')[1].split(';')[0]
            link.download += '.' + ext
          }
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
        }
      } catch (error) {
        console.error('Error opening document:', error)
        alert('Unable to open document. Please try downloading it instead.')
      }
    } else {
      // Regular URL - open normally
      window.open(url, '_blank')
    }
  }

  return (
    <button
      onClick={handleClick}
      className={className}
      title={title}
    >
      {children}
    </button>
  )
}


