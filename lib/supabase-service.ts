"use client"

import { getSupabaseClient } from "./supabase-client"
import type { SupabaseClient } from "@supabase/supabase-js"

// Type for the logger function to ensure consistent logging
type LoggerFunction = (message: string, level: "info" | "warning" | "error" | "success", details?: any) => void

// Default bucket name - used consistently throughout the application
export const DEFAULT_BUCKET_NAME = "nine-picture-grid-images"

export class SupabaseService {
  private logger?: LoggerFunction
  private bucketName: string
  private bucketInitialized = false

  constructor(bucketName: string = DEFAULT_BUCKET_NAME) {
    // Store the bucket name
    this.bucketName = bucketName
  }

  // Get the Supabase client from the singleton
  private getClient(): SupabaseClient {
    return getSupabaseClient()
  }

  // Set the logger after initialization to avoid render-time logging
  setLogger(logger: LoggerFunction) {
    this.logger = logger
    this.log("Supabase service initialized", "info")
  }

  // Safe logging method that checks if logger exists
  private log(message: string, level: "info" | "warning" | "error" | "success", details?: any) {
    if (this.logger) {
      this.logger(message, level, details)
    }
  }

  /**
   * Ensures the bucket exists, creating it if necessary
   */
  async ensureBucketExists(): Promise<boolean> {
    try {
      // If we've already initialized the bucket in this session, return true
      if (this.bucketInitialized) {
        return true
      }

      const supabase = this.getClient()
      this.log(`Checking if bucket exists: '${this.bucketName}'`, "info")

      // Check if bucket exists
      const { data: buckets, error: listError } = await supabase.storage.listBuckets()

      if (listError) {
        this.log("Error listing buckets", "error", listError)
        throw listError
      }

      // Check if our bucket is in the list
      const bucketExists = buckets.some((bucket) => bucket.name === this.bucketName)

      if (bucketExists) {
        this.log(`Bucket '${this.bucketName}' already exists`, "success")
        this.bucketInitialized = true
        return true
      }

      // Bucket doesn't exist, create it
      this.log(`Bucket '${this.bucketName}' not found, initiating bucket creation`, "info")

      const { data: createdBucket, error: createError } = await supabase.storage.createBucket(this.bucketName, {
        public: true, // Make bucket public for easier access
        fileSizeLimit: 5242880, // 5MB limit
      })

      if (createError) {
        this.log(`Failed to create bucket '${this.bucketName}'`, "error", createError)
        throw createError
      }

      this.log(`Successfully created Supabase Storage bucket: '${this.bucketName}'`, "success", createdBucket)
      this.bucketInitialized = true
      return true
    } catch (error) {
      this.log(`Error ensuring bucket '${this.bucketName}' exists`, "error", error)
      return false
    }
  }

  /**
   * Uploads an image to the bucket
   */
  async uploadImage(imageData: string, slotNumber: number): Promise<string | null> {
    try {
      const supabase = this.getClient()

      // Check if user is authenticated
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        throw new Error("Authentication required to upload images")
      }

      // Ensure bucket exists before attempting upload
      const bucketExists = await this.ensureBucketExists()

      if (!bucketExists) {
        throw new Error(`Cannot upload image: bucket '${this.bucketName}' does not exist and could not be created`)
      }

      // Generate a unique file name based on slot number
      const fileName = `slot-${slotNumber}-${Date.now()}.jpg`

      this.log(`Attempting to upload image to bucket '${this.bucketName}', file: '${fileName}'`, "info")

      // Convert base64 data URL to blob
      const base64Data = imageData.split(",")[1]
      const blob = this.base64ToBlob(base64Data, "image/jpeg")

      // Upload the image
      const { data, error } = await supabase.storage.from(this.bucketName).upload(fileName, blob, {
        upsert: true,
        contentType: "image/jpeg",
      })

      if (error) {
        this.log(`Error uploading image to bucket '${this.bucketName}'`, "error", error)
        throw error
      }

      // Get the public URL
      const { data: publicUrlData } = supabase.storage.from(this.bucketName).getPublicUrl(fileName)

      const publicUrl = publicUrlData.publicUrl

      this.log(`Successfully uploaded image to bucket '${this.bucketName}'`, "success", {
        fileName,
        publicUrl,
      })

      return publicUrl
    } catch (error) {
      this.log(`Failed to upload image to bucket '${this.bucketName}'`, "error", error)
      return null
    }
  }

  /**
   * Retrieves all images for the grid
   */
  async getGridImages(): Promise<{ [key: number]: string }> {
    try {
      const supabase = this.getClient()

      // Ensure bucket exists before attempting to list files
      const bucketExists = await this.ensureBucketExists()

      if (!bucketExists) {
        this.log(`Cannot retrieve images: bucket '${this.bucketName}' does not exist`, "error")
        return {}
      }

      this.log(`Listing files in bucket '${this.bucketName}'`, "info")

      // List all files in the bucket
      const { data: files, error } = await supabase.storage.from(this.bucketName).list()

      if (error) {
        this.log(`Error listing files in bucket '${this.bucketName}'`, "error", error)
        throw error
      }

      if (!files || files.length === 0) {
        this.log(`No files found in bucket '${this.bucketName}'`, "info")
        return {}
      }

      this.log(`Found ${files.length} files in bucket '${this.bucketName}'`, "success")

      // Process files to extract slot numbers and get public URLs
      const slotImages: { [key: number]: string } = {}

      for (const file of files) {
        // Extract slot number from file name (format: slot-{number}-timestamp.jpg)
        const match = file.name.match(/^slot-(\d+)-/)

        if (match && match[1]) {
          const slotNumber = Number.parseInt(match[1], 10)

          // Get public URL for the file
          const { data: publicUrlData } = supabase.storage.from(this.bucketName).getPublicUrl(file.name)

          slotImages[slotNumber] = publicUrlData.publicUrl
        }
      }

      this.log(`Processed image URLs for ${Object.keys(slotImages).length} slots`, "success")

      return slotImages
    } catch (error) {
      this.log(`Error retrieving grid images from bucket '${this.bucketName}'`, "error", error)
      return {}
    }
  }

  /**
   * Deletes an image from the bucket
   */
  async deleteImage(slotNumber: number): Promise<boolean> {
    try {
      const supabase = this.getClient()

      // Check if user is authenticated
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        throw new Error("Authentication required to delete images")
      }

      // Ensure bucket exists before attempting to delete
      const bucketExists = await this.ensureBucketExists()

      if (!bucketExists) {
        this.log(`Cannot delete image: bucket '${this.bucketName}' does not exist`, "error")
        return false
      }

      this.log(`Listing files in bucket '${this.bucketName}' for slot ${slotNumber}`, "info")

      // List all files in the bucket
      const { data: files, error: listError } = await supabase.storage.from(this.bucketName).list()

      if (listError) {
        this.log(`Error listing files in bucket '${this.bucketName}'`, "error", listError)
        throw listError
      }

      // Find files matching the slot number
      const filesToDelete =
        files?.filter((file) => file.name.startsWith(`slot-${slotNumber}-`)).map((file) => file.name) || []

      if (filesToDelete.length === 0) {
        this.log(`No files found for slot ${slotNumber} in bucket '${this.bucketName}'`, "info")
        return true // Nothing to delete is still a successful operation
      }

      this.log(`Attempting to delete ${filesToDelete.length} files for slot ${slotNumber}`, "info", filesToDelete)

      // Delete the files
      const { data, error: deleteError } = await supabase.storage.from(this.bucketName).remove(filesToDelete)

      if (deleteError) {
        this.log(`Error deleting files for slot ${slotNumber}`, "error", deleteError)
        throw deleteError
      }

      this.log(`Successfully deleted files for slot ${slotNumber}`, "success", data)

      return true
    } catch (error) {
      this.log(`Error deleting image for slot ${slotNumber}`, "error", error)
      return false
    }
  }

  /**
   * Helper function to convert base64 to Blob
   */
  private base64ToBlob(base64: string, contentType: string): Blob {
    const byteCharacters = atob(base64)
    const byteArrays = []

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512)

      const byteNumbers = new Array(slice.length)
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i)
      }

      const byteArray = new Uint8Array(byteNumbers)
      byteArrays.push(byteArray)
    }

    return new Blob(byteArrays, { type: contentType })
  }

  /**
   * Test the Supabase connection
   */
  async testConnection(): Promise<{ success: boolean; error?: any }> {
    try {
      const supabase = this.getClient()
      this.log("Testing Supabase connection", "info")

      // Try to list buckets as a simple connection test
      const { data, error } = await supabase.storage.listBuckets()

      if (error) {
        this.log("Supabase connection test failed", "error", error)
        return { success: false, error }
      }

      this.log("Supabase connection test successful", "success", {
        bucketsCount: data.length,
        buckets: data.map((b) => b.name),
      })

      return { success: true }
    } catch (error) {
      this.log("Supabase connection test failed with exception", "error", error)
      return { success: false, error }
    }
  }
}

