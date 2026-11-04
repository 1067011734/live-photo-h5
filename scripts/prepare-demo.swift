// Optional macOS helper: swift scripts/prepare-demo.swift input.mp4 output.jpg
import Foundation
import AVFoundation
import ImageIO
import UniformTypeIdentifiers

guard CommandLine.arguments.count == 3 else { fatalError("Expected input.mp4 output.jpg") }
let asset = AVURLAsset(url: URL(fileURLWithPath: CommandLine.arguments[1]))
let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
let image = try generator.copyCGImage(at: .zero, actualTime: nil)
let url = URL(fileURLWithPath: CommandLine.arguments[2])
guard let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else {
    fatalError("Unable to create image")
}
CGImageDestinationAddImage(destination, image, [kCGImageDestinationLossyCompressionQuality: 0.88] as CFDictionary)
guard CGImageDestinationFinalize(destination) else { fatalError("Unable to write image") }
print("Poster written: \(url.lastPathComponent)")
