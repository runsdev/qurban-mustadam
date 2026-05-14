import { useState } from "react";

export default function PanitPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [animalId, setAnimalId] = useState("");
  const [processStage, setProcessStage] = useState("");
  const [mediaUrl, setMediaUrl] = useState(null);
  const [mediaType, setMediaType] = useState(""); // 'image' or 'video'
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogin = async (password) => {
    try {
      const res = await fetch("/api/panit/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      
      if (!data.success) {
        setError(data.error || "Login failed");
        return false;
      }
      
      setAuthenticated(true);
      setError("");
      return true;
    } catch (err) {
      setError("Login error");
      return false;
    }
  };

  const handleCapture = async (type) => {
    try {
      setMediaType(type);
      
      if (type === "image") {
        // Simulate image capture (in real app, use camera API)
        setMediaUrl("/placeholder-image.jpg"); // Placeholder
      } else if (type === "video") {
        // Simulate video capture
        setMediaUrl("/placeholder-video.mp4"); // Placeholder
      }
    } catch (err) {
      setError("Failed to capture media");
    }
  };

  const handleUpload = async () => {
    if (!animalId || !processStage || !mediaUrl) {
      setError("Please select animal, process stage, and capture media");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      // In a real implementation, we would:
      // 1. Get the actual media file (Blob) from camera
      // 2. Upload to Google Drive using lib/drive.ts
      // 3. Send notification
      // 4. Update animal status
      
      // For now, simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate successful upload and processing
      setSuccess("Media uploaded successfully! Notification sent and status updated.");
      setMediaUrl(null);
      setMediaType("");
      // In a real app, we might reset the form or keep it for another upload
    } catch (err) {
      setError("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md space-y-6 p-8 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-center text-gray-800">
            Panit Login
          </h2>
          <p className="text-center text-gray-600">
            Enter 6-digit password to access media upload system
          </p>
          
          {error && <p className="text-center text-red-500">{error}</p>}
          
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const password = formData.get("password");
            handleLogin(password);
          }}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                maxLength="6"
                pattern="[0-9]*"
                inputMode="numeric"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="______"
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Login
            </button>
          </form>
          
          <p className="text-xs text-center text-gray-500">
            Password must be exactly 6 digits
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Panit Media Upload
          </h1>
          <button
            onClick={() => setAuthenticated(false)}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Logout
          </button>
        </div>
        
        {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">{error}</div>}
        {success && <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md text-green-800">{success}</div>}
        
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Animal Selection
            </h2>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Animal ID
              </label>
              <input
                type="text"
                value={animalId}
                onChange={(e) => setAnimalId(e.target.value.toUpperCase().trim())}
                placeholder="Enter animal ID (e.g., #001)"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Process Stage Classification
            </h2>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Select Qurban Process Stage
              </label>
              <div className="grid grid-cols-2 gap-3">
                ["Persiapan", "Disembelih", "Pengolahan", "Distribusi", "Selesai"].map((stage) => (
                  <label key={stage} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value={stage}
                      checked={processStage === stage}
                      onChange={(e) => setProcessStage(e.target.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{stage}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Media Capture
            </h2>
            
            {mediaUrl && mediaType ? (
              <div className="space-y-4">
                {mediaType === "image" && (
                  <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden bg-gray-200">
                    <img
                      src={mediaUrl}
                      alt="Captured"
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}
                {mediaType === "video" && (
                  <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden bg-gray-200">
                    <video
                      src={mediaUrl}
                      controls
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setMediaUrl(null);
                      setMediaType("");
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Retake
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => handleCapture("image")}
                    disabled={uploading}
                    className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    📸 Capture Photo
                  </button>
                  <button
                    onClick={() => handleCapture("video")}
                    disabled={uploading}
                    className="flex-1 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    🎥 Record Video
                  </button>
                </div>
                
                <div className="text-center text-sm text-gray-500">
                  In a real implementation, this would use the device camera
                  and microphone APIs to capture actual media
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <button
              onClick={handleUpload}
              disabled={uploading || !animalId || !processStage || !mediaUrl}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 114 0 2 2 0 00-4 0z"></path>
                  </svg>
                  <span>Send to Drive & Notify</span>
                </>
              )}
            </button>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4 mt-6">
            <h3 className="font-semibold text-blue-800 mb-2">
              How It Works
            </h3>
            <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-2">
              <li>Enter animal ID (e.g., #001)</li>
              <li>Select the qurban process stage</li>
              <li>Capture photo or video using device camera</li>
              <li>Click "Send to Drive & Notify" to:
                <ul className="list-disc pl-5 mt-1 text-xs">
                  <li>Upload media to Google Drive in /(animal ID)/(process stage)/ folder</li>
                  <li>Send push notification to shohibul(s)</li>
                  <li>Update animal status in spreadsheet to next stage</li>
                </ul>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}