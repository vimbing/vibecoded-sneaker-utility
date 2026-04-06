import { useState, useCallback, useRef } from 'react'

interface FileDropZoneProps {
  onLoadText: (text: string) => void
  onLoadBinary: (buffer: ArrayBuffer) => void
}

const BINARY_EXTENSIONS = ['.chlz']

function isBinaryFile(name: string): boolean {
  return BINARY_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext))
}

export function FileDropZone({ onLoadText, onLoadBinary }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      if (isBinaryFile(file.name)) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const buffer = e.target?.result as ArrayBuffer
          if (buffer) onLoadBinary(buffer)
        }
        reader.readAsArrayBuffer(file)
      } else {
        const reader = new FileReader()
        reader.onload = (e) => {
          const text = e.target?.result as string
          if (text) onLoadText(text)
        }
        reader.readAsText(file)
      }
    },
    [onLoadText, onLoadBinary]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  return (
    <div
      className={`flex flex-col items-center justify-center h-screen transition-colors ${
        isDragging ? 'bg-white/5' : ''
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div
        className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-white/40 bg-white/5'
            : 'border-white/10 hover:border-white/20'
        }`}
        onClick={() => inputRef.current?.click()}
      >
        <div className="text-4xl mb-4 opacity-30">{ }</div>
        <h2 className="text-xl font-medium text-white/80 mb-2">
          Drop a .har, .json, .chlsj, or .chlz file here
        </h2>
        <p className="text-sm text-white/40">or click to browse</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".har,.json,.chlsj,.chlz"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
    </div>
  )
}
