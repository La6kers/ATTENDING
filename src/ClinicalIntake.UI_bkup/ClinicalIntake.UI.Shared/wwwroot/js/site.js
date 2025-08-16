function scrollToBottom(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollTop = element.scrollHeight;
    }
}

window.cameraInterop = {
    startCamera: async (videoElementId) => {
        try {
            const videoElement = document.getElementById(videoElementId);
            if (!videoElement) {
                console.error("Video element not found");
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoElement.srcObject = stream;
            videoElement.play();
        } catch (error) {
            console.error("Error accessing the camera:", error);
        }
    },
    stopCamera: (videoElementId) => {
        const videoElement = document.getElementById(videoElementId);
        if (videoElement && videoElement.srcObject) {
            const stream = videoElement.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach((track) => track.stop());
            videoElement.srcObject = null;
        }
    },
    takePicture: (videoElementId, canvasElementId) => {
        const videoElement = document.getElementById(videoElementId);
        const canvasElement = document.getElementById(canvasElementId);

        if (!videoElement || !canvasElement) {
            console.error("Video or canvas element not found");
            return;
        }

        const context = canvasElement.getContext("2d");
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;

        // Draw the current video frame onto the canvas
        context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

        // Optionally, return the image data URL
        return canvasElement.toDataURL("image/png");
    },
    hasWebcam: async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.some(device => device.kind === "videoinput");
        } catch (error) {
            console.error("Error checking for webcam:", error);
            return false;
        }
    }
}