// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "Ragaflow",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "RagaflowModels", targets: ["RagaflowModels"]),
    ],
    targets: [
        .target(
            name: "RagaflowModels",
            path: "Ragaflow/Models"
        ),
        .testTarget(
            name: "RagaflowModelTests",
            dependencies: ["RagaflowModels"],
            path: "Tests/RagaflowModelTests"
        ),
    ]
)
