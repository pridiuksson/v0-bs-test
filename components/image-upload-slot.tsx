"use client"

import type React from "react"

import { useState, useRef } from "react"
import { ImageIcon, X, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLogs } from "@/context/log-context"

interface ImageUploadSlotProps {
  imageUrl: string
  onImageUpload: (imageUrl: string) => void
  onImageRemove: () => void
  onImageZoom: (imageUrl: string) => void
  onZoomEnd: () => void
  isAuthenticated: boolean
}

export default function ImageUploadSlot({
  imageUrl,
  onImageUpload,
  onImageRemove,
  onImageZoom,
  onZoomEnd,
  isAuthenticated,
}: ImageUploadSlotProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addLog } = useLogs()

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (isAuthenticated) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    setUploadError(null)

    // Check if user is authenticated
    if (!isAuthenticated) {
      addLog("Upload attempted without authentication", "error")
      setUploadError("Authentication required to upload images")
      return
    }

    try {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        addLog("File dropped for upload", "info", {
          fileName: e.dataTransfer.files[0].name,
          fileSize: e.dataTransfer.files[0].size,
          fileType: e.dataTransfer.files[0].type,
        })
        handleFile(e.dataTransfer.files[0])
      } else {
        const error = "No file found in drop event"
        setUploadError(error)
        addLog(error, "warning")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setUploadError(errorMessage)
      addLog("Error handling dropped file", "error", error)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null)

    // Check if user is authenticated
    if (!isAuthenticated) {
      addLog("Upload attempted without authentication", "error")
      setUploadError("Authentication required to upload images")
      return
    }

    try {
      if (e.target.files && e.target.files[0]) {
        addLog("File selected for upload", "info", {
          fileName: e.target.files[0].name,
          fileSize: e.target.files[0].size,
          fileType: e.target.files[0].type,
        })
        handleFile(e.target.files[0])
      } else {
        const error = "No file selected"
        setUploadError(error)
        addLog(error, "warning")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setUploadError(errorMessage)
      addLog("Error handling file input", "error", error)
    }
  }

  const handleFile = async (file: File) => {
    try {
      setIsUploading(true)
      setUploadError(null)

      // Validate file type
      if (!file.type.match("image.*")) {
        const error = "Please select an image file"
        setUploadError(error)
        addLog("Invalid file type", "error", {
          fileType: file.type,
          expectedType: "image/*",
        })
        setIsUploading(false)
        return
      }

      addLog("Processing file", "info", {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      })

      // Read the file
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          if (e.target && typeof e.target.result === "string") {
            addLog("File read successfully", "success")
            processImageToSquare(e.target.result)
          } else {
            throw new Error("Failed to read file data")
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          setUploadError(errorMessage)
          addLog("Error in FileReader onload", "error", error)
          setIsUploading(false)
        }
      }

      reader.onerror = (e) => {
        const errorMessage = e?.target?.error?.message || "Error reading file"
        setUploadError(errorMessage)
        addLog("FileReader error", "error", e)
        setIsUploading(false)
      }

      reader.readAsDataURL(file)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setUploadError(errorMessage)
      addLog("Error handling file", "error", error)
      setIsUploading(false)
    }
  }

  // Process image to square format
  const processImageToSquare = (dataUrl: string) => {
    try {
      addLog("Processing image to square format", "info")

      const img = new Image()

      img.onload = () => {
        try {
          addLog("Image loaded for processing", "info", {
            width: img.width,
            height: img.height,
          })

          // Create canvas for square cropping
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")

          if (!ctx) {
            const error = "Failed to get canvas context"
            setUploadError(error)
            addLog(error, "error")
            // Fallback if canvas context isn't available
            onImageUpload(dataUrl)
            setIsUploading(false)
            return
          }

          // Determine the size of the square
          const size = Math.min(img.width, img.height)

          // Set canvas to be square
          canvas.width = size
          canvas.height = size

          // Calculate cropping position (center crop)
          const offsetX = (img.width - size) / 2
          const offsetY = (img.height - size) / 2

          // Draw the image on the canvas with cropping
          ctx.drawImage(
            img,
            offsetX,
            offsetY,
            size,
            size, // Source rectangle (crop)
            0,
            0,
            size,
            size, // Destination rectangle
          )

          // Convert canvas to data URL and upload
          const squareImageDataUrl = canvas.toDataURL("image/jpeg", 0.92)

          addLog("Image processed successfully", "success", {
            originalSize: `${img.width}x${img.height}`,
            newSize: `${size}x${size}`,
          })

          onImageUpload(squareImageDataUrl)
          setIsUploading(false)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          setUploadError(errorMessage)
          addLog("Error processing image in canvas", "error", error)
          setIsUploading(false)
        }
      }

      img.onerror = (error) => {
        const errorMessage = "Error loading image for processing"
        setUploadError(errorMessage)
        addLog(errorMessage, "error", error)
        setIsUploading(false)
      }

      img.src = dataUrl
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setUploadError(errorMessage)
      addLog("Error in processImageToSquare", "error", error)
      setIsUploading(false)
    }
  }

  const triggerFileInput = () => {
    if (isAuthenticated) {
      fileInputRef.current?.click()
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (imageUrl) {
      e.preventDefault() // Prevent default behavior
      onImageZoom(imageUrl)
    }
  }

  return (
    <div
      className={`relative aspect-square border-2 ${
        isDragging
          ? "border-primary border-dashed bg-primary/10"
          : imageUrl
            ? "border-transparent"
            : isAuthenticated
              ? "border-dashed border-gray-300"
              : "border-dashed border-gray-200 bg-gray-50"
      } rounded-md overflow-hidden flex items-center justify-center transition-colors`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={!imageUrl && isAuthenticated ? triggerFileInput : undefined}
    >
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileInput} />

      {imageUrl ? (
        <>
          <div className="relative w-full h-full overflow-hidden" onMouseDown={handleMouseDown}>
            <img
              src={imageUrl || "/placeholder.svg"}
              alt="Uploaded image"
              className="w-full h-full object-cover cursor-zoom-in"
            />
          </div>
          {isAuthenticated && (
            <Button
              size="icon"
              variant="destructive"
              className="absolute top-2 right-2 h-8 w-8 opacity-80 hover:opacity-100 z-10"
              onClick={(e) => {
                e.stopPropagation()
                onImageRemove()
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </>
      ) : (
        <div className="text-center p-4 cursor-pointer">
          {isUploading ? (
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-sm text-gray-500">Uploading...</p>
            </div>
          ) : isAuthenticated ? (
            <>
              <ImageIcon className="h-10 w-10 mx-auto text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">Click or drag image here</p>
              {uploadError && <p className="mt-2 text-xs text-red-500">{uploadError}</p>}
            </>
          ) : (
            <>
              <Lock className="h-10 w-10 mx-auto text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">Sign in to upload</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

