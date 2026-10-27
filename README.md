# Vision Lab — AI Image Classifier

A browser-based image classifier for a VAC project, powered by an image model exported from Google Teachable Machine. It supports image uploads, drag-and-drop, and live webcam classification.

## Set up a Teachable Machine model

1. Open [Teachable Machine](https://teachablemachine.withgoogle.com/) and create an **Image Project**.
2. Add class names and examples, then train the model.
3. Choose **Export Model** → **Upload my model** → **Upload**.
4. Copy the shareable model link.

## Run the project

Open a terminal in this project folder and start a local web server:

```powershell
py -m http.server 8000
```

Visit [http://localhost:8000](http://localhost:8000), paste your Teachable Machine model link, and select **Load model**. Then upload an image or select **Use camera**. Webcam access requires localhost or HTTPS and your permission.

The TensorFlow.js and Teachable Machine libraries load from jsDelivr, and the exported model is downloaded from Teachable Machine. Image and camera predictions run in your browser; images are not uploaded by this app. Your model link is saved in browser storage for convenience.

## Try the sample image

After connecting your model, choose `samples/red-apple.svg` from the upload control or drag it onto the image area. It is an original illustration; predictions depend on the classes in your trained model.

## Project files

- `index.html` — app structure and external library imports
- `styles.css` — responsive layout and visual design
- `app.js` — model loading, image handling, webcam, and predictions
- `samples/red-apple.svg` — original sample image to try with your model
