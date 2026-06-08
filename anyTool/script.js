const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");
const imagePreview = document.querySelector("#imagePreview");
const previewShell = document.querySelector("#previewShell");
const imagePlaceholder = document.querySelector("#imagePlaceholder");
const cropBox = document.querySelector("#cropBox");
const imageStatus = document.querySelector("#imageStatus");
const resizeStatus = document.querySelector("#resizeStatus");
const compressStatus = document.querySelector("#compressStatus");
const qualityRange = document.querySelector("#qualityRange");
const qualityValue = document.querySelector("#qualityValue");
const cropButton = document.querySelector("#cropButton");
const resizeButton = document.querySelector("#resizeButton");
const compressButton = document.querySelector("#compressButton");
const downloadImageButton = document.querySelector("#downloadImageButton");
const downloadResizeButton = document.querySelector("#downloadResizeButton");
const downloadCompressButton = document.querySelector("#downloadCompressButton");
const resetImageButton = document.querySelector("#resetImageButton");
const imageUploadInput = document.querySelector("#imageUpload");

const supportedImageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

let selectedImageName = "";
let selectedImageType = "image/png";
let cropDrag = null;
let croppedImage = null;
let resizedImage = null;
let compressedImage = null;

navToggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

navLinks.addEventListener("click", (event) => {
  if (event.target.matches("a")) {
    navLinks.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  }
});

function setStatus(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("error", isError);
}

function setLoading(button, isLoading) {
  button.disabled = isLoading;
  button.classList.toggle("is-loading", isLoading);
}

function setPreviewLoading(isLoading) {
  previewShell.classList.toggle("is-loading", isLoading);
}

function resetImageOutputs() {
  croppedImage = null;
  resizedImage = null;
  compressedImage = null;
  downloadImageButton.disabled = true;
  downloadResizeButton.disabled = true;
  downloadCompressButton.disabled = true;
  setStatus(resizeStatus, "");
  setStatus(compressStatus, "");
}

function clearImagePreview() {
  selectedImageName = "";
  selectedImageType = "image/png";
  imagePreview.removeAttribute("src");
  imagePreview.onload = null;
  imageUploadInput.value = "";
  previewShell.classList.remove("has-image", "is-loading");
  resetCropBox();
  resetImageOutputs();
  resetImageButton.disabled = true;
  document.querySelector("#resizeWidth").value = "";
  document.querySelector("#resizeHeight").value = "";
  setStatus(imageStatus, "");
}

function getOutputType(type = selectedImageType) {
  return supportedImageTypes.has(type) ? type : "image/png";
}

function getExtension(type) {
  if (type === "image/jpeg") {
    return "jpg";
  }
  if (type === "image/webp") {
    return "webp";
  }
  return "png";
}

function getFileName(prefix, type) {
  return `anytool-${prefix}-image.${getExtension(type)}`;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Image export failed."));
        return;
      }
      resolve(blob);
    }, type, quality);
  });
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function handleImageFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    setStatus(imageStatus, "Please upload a valid image file.", true);
    return;
  }

  selectedImageName = file.name;
  selectedImageType = getOutputType(file.type);
  resetImageOutputs();
  resetImageButton.disabled = true;
  previewShell.classList.remove("has-image");
  setPreviewLoading(true);
  setStatus(imageStatus, "Loading image preview...");
  const reader = new FileReader();

  reader.addEventListener("load", () => {
    imagePreview.onload = () => {
      document.querySelector("#resizeWidth").value = imagePreview.naturalWidth;
      document.querySelector("#resizeHeight").value = imagePreview.naturalHeight;
      setPreviewLoading(false);
      previewShell.classList.add("has-image");
      resetImageButton.disabled = false;
      resetCropBox();
      setStatus(imageStatus, `${file.name} uploaded. Move the crop box to choose what you want to keep.`);
    };
    imagePreview.onerror = () => {
      setPreviewLoading(false);
      clearImagePreview();
      setStatus(imageStatus, "Image preview failed to load. Try another image.", true);
    };
    imagePreview.src = reader.result;
  });

  reader.addEventListener("error", () => {
    setPreviewLoading(false);
    clearImagePreview();
    setStatus(imageStatus, "Image upload failed. Try again.", true);
  });

  reader.readAsDataURL(file);
}

function setupDropZone(zone) {
  const input = zone.querySelector("input");
  const type = zone.dataset.dropZone;

  ["dragenter", "dragover"].forEach((eventName) => {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.add("drag-over");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.remove("drag-over");
    });
  });

  zone.addEventListener("drop", (event) => {
    const file = event.dataTransfer.files[0];
    if (type === "image") {
      handleImageFile(file);
    }
  });

  input.addEventListener("change", () => {
    const file = input.files[0];
    if (type === "image") {
      handleImageFile(file);
    }
  });
}

function resetCropBox() {
  cropBox.style.left = "50%";
  cropBox.style.top = "50%";
  cropBox.style.width = "46%";
  cropBox.style.height = "44%";
  cropBox.style.transform = "translate(-50%, -50%)";
}

function getDisplayedImageRect() {
  const shellRect = previewShell.getBoundingClientRect();
  const naturalRatio = imagePreview.naturalWidth / imagePreview.naturalHeight;
  const shellRatio = shellRect.width / shellRect.height;
  let width = shellRect.width;
  let height = shellRect.height;

  if (shellRatio > naturalRatio) {
    width = height * naturalRatio;
  } else {
    height = width / naturalRatio;
  }

  return {
    left: shellRect.left + (shellRect.width - width) / 2,
    top: shellRect.top + (shellRect.height - height) / 2,
    width,
    height
  };
}

cropBox.addEventListener("pointerdown", (event) => {
  if (!selectedImageName) {
    return;
  }

  const shellRect = previewShell.getBoundingClientRect();
  const boxRect = cropBox.getBoundingClientRect();

  cropDrag = {
    offsetX: event.clientX - boxRect.left,
    offsetY: event.clientY - boxRect.top,
    shellRect
  };

  cropBox.setPointerCapture(event.pointerId);
});

cropBox.addEventListener("pointermove", (event) => {
  if (!cropDrag) {
    return;
  }

  const boxRect = cropBox.getBoundingClientRect();
  const maxLeft = cropDrag.shellRect.width - boxRect.width;
  const maxTop = cropDrag.shellRect.height - boxRect.height;
  const nextLeft = event.clientX - cropDrag.shellRect.left - cropDrag.offsetX;
  const nextTop = event.clientY - cropDrag.shellRect.top - cropDrag.offsetY;
  const left = Math.max(0, Math.min(nextLeft, maxLeft));
  const top = Math.max(0, Math.min(nextTop, maxTop));

  cropBox.style.transform = "none";
  cropBox.style.left = `${left}px`;
  cropBox.style.top = `${top}px`;
});

cropBox.addEventListener("pointerup", () => {
  cropDrag = null;
});

document.querySelectorAll("[data-drop-zone]").forEach(setupDropZone);

qualityRange.addEventListener("input", () => {
  qualityValue.textContent = `${qualityRange.value}%`;
});

resetImageButton.addEventListener("click", () => {
  clearImagePreview();
});

cropButton.addEventListener("click", async () => {
  if (!selectedImageName) {
    setStatus(imageStatus, "Upload an image before cropping.", true);
    return;
  }

  setLoading(cropButton, true);
  setStatus(imageStatus, "Cropping image...");

  try {
    const imageRect = getDisplayedImageRect();
    const cropRect = cropBox.getBoundingClientRect();
    const left = Math.max(cropRect.left, imageRect.left);
    const top = Math.max(cropRect.top, imageRect.top);
    const right = Math.min(cropRect.right, imageRect.left + imageRect.width);
    const bottom = Math.min(cropRect.bottom, imageRect.top + imageRect.height);
    const width = right - left;
    const height = bottom - top;

    if (width <= 0 || height <= 0) {
      throw new Error("Move the crop box over the image before cropping.");
    }

    const sourceX = ((left - imageRect.left) / imageRect.width) * imagePreview.naturalWidth;
    const sourceY = ((top - imageRect.top) / imageRect.height) * imagePreview.naturalHeight;
    const sourceWidth = (width / imageRect.width) * imagePreview.naturalWidth;
    const sourceHeight = (height / imageRect.height) * imagePreview.naturalHeight;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const type = getOutputType();

    canvas.width = Math.max(1, Math.round(sourceWidth));
    canvas.height = Math.max(1, Math.round(sourceHeight));

    context.drawImage(
      imagePreview,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

    croppedImage = await createImageOutput("cropped", canvas, type, 0.92);
    downloadImageButton.disabled = false;
    setStatus(imageStatus, "Image cropped successfully. Ready to download.");
  } catch (error) {
    downloadImageButton.disabled = true;
    setStatus(imageStatus, error.message, true);
  } finally {
    setLoading(cropButton, false);
  }
});

async function createImageOutput(prefix, canvas, type, quality) {
  const blob = await canvasToBlob(canvas, type, quality);
  const actualType = getOutputType(blob.type || type);

  return {
    blob,
    fileName: getFileName(prefix, actualType)
  };
}

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function drawImageToCanvas(width, height) {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");

  context.drawImage(imagePreview, 0, 0, canvas.width, canvas.height);
  return canvas;
}

resizeButton.addEventListener("click", async () => {
  if (!selectedImageName) {
    setStatus(resizeStatus, "Upload an image before resizing.", true);
    return;
  }

  const width = Number(document.querySelector("#resizeWidth").value);
  const height = Number(document.querySelector("#resizeHeight").value);
  const keepRatio = document.querySelector("#keepRatio").checked;

  if (!width || !height || width < 1 || height < 1) {
    setStatus(resizeStatus, "Enter a valid width and height before resizing.", true);
    return;
  }

  setLoading(resizeButton, true);
  setStatus(resizeStatus, "Resizing image...");

  try {
    let outputWidth = width;
    let outputHeight = height;

    if (keepRatio) {
      const ratio = imagePreview.naturalWidth / imagePreview.naturalHeight;
      outputHeight = Math.round(outputWidth / ratio);
    }

    const type = getOutputType();
    const canvas = drawImageToCanvas(outputWidth, outputHeight);

    resizedImage = await createImageOutput("resized", canvas, type, 0.92);
    downloadResizeButton.disabled = false;
    setStatus(resizeStatus, `Image resized successfully to ${canvas.width} x ${canvas.height}.`);
  } catch (error) {
    downloadResizeButton.disabled = true;
    setStatus(resizeStatus, error.message, true);
  } finally {
    setLoading(resizeButton, false);
  }
});

compressButton.addEventListener("click", async () => {
  if (!selectedImageName) {
    setStatus(compressStatus, "Upload an image before reducing file size.", true);
    return;
  }

  setLoading(compressButton, true);
  setStatus(compressStatus, "Compressing image...");

  try {
    const type = getOutputType();
    const quality = Number(qualityRange.value) / 100;
    const canvas = drawImageToCanvas(imagePreview.naturalWidth, imagePreview.naturalHeight);

    compressedImage = await createImageOutput("compressed", canvas, type, quality);
    downloadCompressButton.disabled = false;
    setStatus(compressStatus, "Image compressed successfully. Ready to download.");
  } catch (error) {
    downloadCompressButton.disabled = true;
    setStatus(compressStatus, error.message, true);
  } finally {
    setLoading(compressButton, false);
  }
});

document.querySelector("#pngToJpgButton").addEventListener("click", () => {
  setStatus(compressStatus, selectedImageName ? "Format conversion backend can be connected next." : "Upload an image before converting.", !selectedImageName);
});

document.querySelector("#jpgToPngButton").addEventListener("click", () => {
  setStatus(compressStatus, selectedImageName ? "Format conversion backend can be connected next." : "Upload an image before converting.", !selectedImageName);
});

downloadImageButton.addEventListener("click", () => {
  if (!croppedImage) {
    setStatus(imageStatus, "Crop the image before downloading.", true);
    return;
  }

  downloadBlob(croppedImage.blob, croppedImage.fileName);
  setStatus(imageStatus, "Image downloaded successfully");
});

downloadResizeButton.addEventListener("click", () => {
  if (!resizedImage) {
    setStatus(resizeStatus, "Resize the image before downloading.", true);
    return;
  }

  downloadBlob(resizedImage.blob, resizedImage.fileName);
  setStatus(resizeStatus, "Image downloaded successfully");
});

downloadCompressButton.addEventListener("click", () => {
  if (!compressedImage) {
    setStatus(compressStatus, "Reduce the file size before downloading.", true);
    return;
  }

  downloadBlob(compressedImage.blob, compressedImage.fileName);
  setStatus(compressStatus, "Image downloaded successfully");
});