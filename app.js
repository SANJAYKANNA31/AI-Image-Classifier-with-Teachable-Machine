(() => {
  const modelForm = document.querySelector("#model-form");
  const modelUrlInput = document.querySelector("#model-url");
  const connectButton = document.querySelector("#connect-button");
  const modelStatus = document.querySelector("#model-status");
  const modelStatusText = document.querySelector("#model-status-text");
  const formMessage = document.querySelector("#form-message");
  const uploadTab = document.querySelector("#upload-tab");
  const cameraTab = document.querySelector("#camera-tab");
  const uploadPanel = document.querySelector("#upload-panel");
  const cameraPanel = document.querySelector("#camera-panel");
  const imageInput = document.querySelector("#image-input");
  const dropzone = document.querySelector("#dropzone");
  const dropzoneContent = document.querySelector("#dropzone-content");
  const previewWrap = document.querySelector("#preview-wrap");
  const imagePreview = document.querySelector("#image-preview");
  const previewName = document.querySelector("#preview-name");
  const removeImageButton = document.querySelector("#remove-image");
  const classifyButton = document.querySelector("#classify-button");
  const uploadHelper = document.querySelector("#upload-helper");
  const cameraButton = document.querySelector("#camera-button");
  const cameraHelper = document.querySelector("#camera-helper");
  const cameraEmpty = document.querySelector("#camera-empty");
  const cameraVideo = document.querySelector("#camera-video");
  const cameraLive = document.querySelector("#camera-live");
  const resultsEmpty = document.querySelector("#results-empty");
  const predictionResults = document.querySelector("#prediction-results");
  const loadingState = document.querySelector("#loading-state");
  const resultsIndicator = document.querySelector("#results-indicator");
  const resultsFooter = document.querySelector(".results-footer");
  const resultsFooterText = document.querySelector("#results-footer-text");

  let model = null;
  let selectedImage = null;
  let selectedImageUrl = null;
  let cameraStream = null;
  let classifyRequest = 0;

  try {
    modelUrlInput.value = localStorage.getItem("vision-lab-model-url") || "";
  } catch {
    // The app remains usable when browser storage is disabled.
  }

  function setModelStatus(state, text) {
    modelStatus.classList.remove("connected", "error");
    if (state) modelStatus.classList.add(state);
    modelStatusText.textContent = text;
  }

  function updateSourceControls() {
    classifyButton.disabled = !model || !selectedImage;
    cameraButton.disabled = !model;
    uploadHelper.textContent = model
      ? selectedImage ? "Ready to classify." : "Choose an image to get a prediction."
      : "Connect a model to get started.";
    cameraHelper.textContent = model
      ? cameraStream ? "Live predictions update automatically." : "Your camera stays on this device."
      : "Connect a model before starting your camera.";
  }

  function showResultState(state) {
    resultsEmpty.classList.toggle("hidden", state !== "empty");
    predictionResults.classList.toggle("hidden", state !== "predictions");
    loadingState.classList.toggle("hidden", state !== "loading");
    resultsIndicator.classList.toggle("is-ready", state === "predictions");
    resultsIndicator.classList.toggle("is-loading", state === "loading");
    resultsIndicator.setAttribute("aria-label", state === "predictions" ? "Predictions ready" : state === "loading" ? "Analyzing image" : "Waiting for image");
    resultsFooter.classList.toggle("is-active", state === "predictions");
    resultsFooterText.textContent = state === "predictions" ? "Analysis complete" : state === "loading" ? "Analyzing image" : "Awaiting input";
  }

  function normalizeModelUrl(value) {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      url.hostname !== "teachablemachine.withgoogle.com" ||
      !url.pathname.startsWith("/models/")
    ) {
      throw new Error("Use the HTTPS share link for a Teachable Machine image model.");
    }
    url.search = "";
    url.hash = "";
    url.pathname = url.pathname.replace(/(?:model|metadata)\.json\/?$/i, "").replace(/\/+$/, "") + "/";
    return url.href;
  }

  modelForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    formMessage.textContent = "";
    let baseUrl;
    try {
      baseUrl = normalizeModelUrl(modelUrlInput.value);
    } catch (error) {
      formMessage.textContent = error instanceof TypeError
        ? "Enter a valid Teachable Machine model link."
        : error.message;
      setModelStatus("error", "Invalid link");
      return;
    }

    if (!window.tmImage) {
      formMessage.textContent = "The model library could not load. Check your internet connection and refresh.";
      setModelStatus("error", "Library unavailable");
      return;
    }

    connectButton.disabled = true;
    connectButton.classList.add("is-loading");
    connectButton.querySelector("span").textContent = "Loading…";
    setModelStatus("", "Loading model…");
    try {
      const loadedModel = await window.tmImage.load(`${baseUrl}model.json`, `${baseUrl}metadata.json`);
      model = loadedModel;
      try {
        localStorage.setItem("vision-lab-model-url", baseUrl);
      } catch {
        // Model loading should not depend on storage availability.
      }
      setModelStatus("connected", "Model connected");
      formMessage.textContent = "";
      updateSourceControls();
      if (selectedImage) classifyImage();
    } catch (error) {
      model = null;
      setModelStatus("error", "Could not load");
      formMessage.textContent = "Couldn't load that model. Check the link, make sure the model is uploaded, and try again.";
      updateSourceControls();
      console.error("Teachable Machine model loading failed:", error);
    } finally {
      connectButton.disabled = false;
      connectButton.classList.remove("is-loading");
      connectButton.querySelector("span").textContent = "Load model";
    }
  });

  function setActiveTab(tab) {
    const uploadActive = tab === "upload";
    uploadTab.classList.toggle("active", uploadActive);
    cameraTab.classList.toggle("active", !uploadActive);
    uploadTab.setAttribute("aria-selected", String(uploadActive));
    cameraTab.setAttribute("aria-selected", String(!uploadActive));
    uploadPanel.classList.toggle("hidden", !uploadActive);
    cameraPanel.classList.toggle("hidden", uploadActive);
    uploadPanel.hidden = !uploadActive;
    cameraPanel.hidden = uploadActive;
    if (uploadActive) stopCamera();
  }

  uploadTab.addEventListener("click", () => setActiveTab("upload"));
  cameraTab.addEventListener("click", () => setActiveTab("camera"));

  function handleImage(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      formMessage.textContent = "Please choose an image file.";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      formMessage.textContent = "That image is larger than 10 MB. Choose a smaller file.";
      return;
    }
    formMessage.textContent = "";
    selectedImage = file;
    if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
    selectedImageUrl = URL.createObjectURL(file);
    imagePreview.src = selectedImageUrl;
    previewName.textContent = file.name;
    dropzoneContent.classList.add("hidden");
    previewWrap.classList.remove("hidden");
    updateSourceControls();
    if (model) classifyImage();
  }

  imageInput.addEventListener("change", () => {
    handleImage(imageInput.files[0]);
    imageInput.value = "";
  });
  dropzone.addEventListener("click", (event) => {
    if (event.target.closest("#remove-image")) return;
    imageInput.click();
  });
  dropzone.addEventListener("keydown", (event) => {
    if (event.target === dropzone && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      imageInput.click();
    }
  });
  dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzone.classList.add("drag-over");
  });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag-over"));
  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("drag-over");
    handleImage(event.dataTransfer.files[0]);
  });

  removeImageButton.addEventListener("click", (event) => {
    event.stopPropagation();
    classifyRequest += 1;
    selectedImage = null;
    if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
    selectedImageUrl = null;
    imagePreview.removeAttribute("src");
    previewWrap.classList.add("hidden");
    dropzoneContent.classList.remove("hidden");
    showResultState("empty");
    updateSourceControls();
  });

  classifyButton.addEventListener("click", classifyImage);

  async function classifyImage() {
    if (!model || !selectedImage) return;
    const requestId = ++classifyRequest;
    const activeModel = model;
    showResultState("loading");
    try {
      await imagePreview.decode();
      if (requestId !== classifyRequest) return;
      const predictions = await activeModel.predict(imagePreview);
      if (requestId !== classifyRequest) return;
      renderPredictions(predictions);
    } catch (error) {
      if (requestId !== classifyRequest) return;
      showResultState("empty");
      resultsFooterText.textContent = "Could not classify image";
      formMessage.textContent = "The model couldn't classify this image. Try another image.";
      console.error("Image classification failed:", error);
    }
  }

  function renderPredictions(predictions) {
    const sorted = [...predictions].sort((a, b) => b.probability - a.probability);
    const top = sorted[0];
    if (!top) {
      showResultState("empty");
      return;
    }
    const percent = (probability) => `${(probability * 100).toFixed(1)}%`;
    predictionResults.innerHTML = `
      <div class="top-prediction">
        <div class="prediction-label">Best match</div>
        <div class="prediction-name">${escapeHtml(top.className)}</div>
        <div class="prediction-confidence">${percent(top.probability)} confidence</div>
      </div>
      <div class="prediction-list-title"><span>All classes</span><span>CONFIDENCE</span></div>
      ${sorted.map((prediction) => `
        <div class="prediction-row">
          <div class="prediction-row-heading">
            <span title="${escapeHtml(prediction.className)}">${escapeHtml(prediction.className)}</span>
            <span>${percent(prediction.probability)}</span>
          </div>
          <div class="prediction-track"><div class="prediction-bar" style="width: ${Math.max(0, Math.min(100, prediction.probability * 100))}%"></div></div>
        </div>
      `).join("")}
    `;
    showResultState("predictions");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]);
  }

  cameraButton.addEventListener("click", async () => {
    if (cameraStream) {
      stopCamera();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      formMessage.textContent = "Camera access requires HTTPS or localhost and a supported browser.";
      return;
    }
    cameraButton.disabled = true;
    cameraButton.textContent = "Starting…";
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      cameraVideo.srcObject = cameraStream;
      cameraVideo.classList.remove("hidden");
      cameraEmpty.classList.add("hidden");
      cameraLive.classList.remove("hidden");
      cameraButton.innerHTML = '<svg class="camera-button-icon" viewBox="0 0 20 20" aria-hidden="true"><rect x="5" y="5" width="10" height="10" rx="2" /></svg> Stop camera';
      cameraButton.disabled = false;
      updateSourceControls();
      await cameraVideo.play();
      classifyCameraFrame();
    } catch (error) {
      stopCamera();
      formMessage.textContent = error.name === "NotAllowedError"
        ? "Camera permission was denied. Allow camera access in your browser settings and try again."
        : "Couldn't start your camera. Check that it is connected and try again.";
      console.error("Camera startup failed:", error);
    }
  });

  async function classifyCameraFrame() {
    if (!cameraStream || !model) return;
    try {
      const predictions = await model.predict(cameraVideo);
      if (!cameraStream) return;
      renderPredictions(predictions);
    } catch (error) {
      if (!cameraStream) return;
      formMessage.textContent = "Live classification stopped because the model couldn't process a camera frame.";
      console.error("Live camera classification failed:", error);
      stopCamera();
      return;
    }
    if (cameraStream) window.setTimeout(classifyCameraFrame, 250);
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      cameraStream = null;
    }
    cameraVideo.pause();
    cameraVideo.srcObject = null;
    cameraVideo.classList.add("hidden");
    cameraEmpty.classList.remove("hidden");
    cameraLive.classList.add("hidden");
    cameraButton.innerHTML = '<svg class="camera-button-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h2l1.2-2h3.6L13 5h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /><circle cx="10" cy="10" r="3" /></svg> Start camera';
    updateSourceControls();
  }

  cameraVideo.addEventListener("ended", stopCamera);
  window.addEventListener("pagehide", () => {
    stopCamera();
    if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
  });

  updateSourceControls();
})();
