import * as fs from 'fs'
import * as path from 'path'

function getAllTsFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir)
  
  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory()) {
      getAllTsFiles(filePath, fileList)
    } else if (file.endsWith('.ts')) {
      fileList.push(filePath)
    }
  })
  
  return fileList
}

function fixFiles() {
  const apiDir = path.join(process.cwd(), 'app', 'api')
  const files = getAllTsFiles(apiDir)
  
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf-8')
    const originalContent = content
    
    // Fix the type signature
    content = content.replace(
      /withErrorHandling\(async \(req:\s*NextRequest\)/g,
      'withErrorHandling(async (req: Request | NextRequest)'
    )
    
    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf-8')
      console.log(`Fixed: ${file}`)
    }
  }
  
  console.log('Done!')
}

fixFiles()

