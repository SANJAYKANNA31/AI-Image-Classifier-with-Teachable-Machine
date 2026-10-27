# Vision Lab — AI Image Classifier

A browser-based image classifier for a VAC project, powered by an image model exported from Google Teachable Machine. It supports image uploads, drag-and-drop, and live webcam classification.

## Set up a Teachable Machine model

1. Open [Teachable Machine](https://teachablemachine.withgoogle.com/) and create an **Image Project**.
2. Add class names and examples, then train the model.
3. For the browser app, choose **Export Model** → **TensorFlow** → **Upload my model** and copy the shareable link.
4. For the Python classifier, choose **Export Model** → **TensorFlow** → **Keras** → **Download my model**, then extract `keras_model.h5` and `labels.txt` into this project folder..

## Run the project

Open a terminal in this project folder and start a local web server:

```powershell
py -m http.server 8000
```

Visit [http://localhost:8000](http://localhost:8000), paste your Teachable Machine model link, and select **Load model**. Then upload an image or select **Use camera**. Webcam access requires localhost or HTTPS and your permission.

The TensorFlow.js and Teachable Machine libraries load from jsDelivr, and the exported model is downloaded from Teachable Machine. Image and camera predictions run in your browser; images are not uploaded by this app. Your model link is saved in browser storage for convenience.

## Run the Python classifier

Use Python 3.10–3.12. Download and extract the Teachable Machine **Keras** model files (`keras_model.h5` and `labels.txt`) into this project folder. Install the Python dependencies:

```powershell
py -m pip install -r requirements.txt
```

Classify a JPG, PNG, or another image format supported by Pillow:

```powershell
py classify_image.py path\to\your-image.jpg
```

The script prints the highest-scoring class and scores for all classes. If the model or labels are stored elsewhere, pass their paths with `--model` and `--labels`. The included `red-apple.svg` is for the browser demo; use a raster image such as JPG or PNG with the Python script.

## Try the sample image

After connecting your model, choose `red-apple.svg` from the upload control or drag it onto the image area. It is an original illustration; predictions depend on the classes in your trained model.

## Project files

- `index.html` — app structure and external library imports
- `styles.css` — responsive layout and visual design
- `app.js` — model loading, image handling, webcam, and predictions
- `classify_image.py` — Python CLI for classifying one image with a Keras model
- `requirements.txt` — Python dependencies
- `red-apple.svg` — original sample image to try with your model
