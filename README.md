# <img style="margin-bottom: -5px;" src="https://raw.githubusercontent.com/vucinatim/vrm-studio/refs/heads/main/public/images/logo.png" alt="VRM Studio Logo" width="30"/> VRM Studio

Check it out:
<p>
  <a href="https://vrm-studio.vercel.app/" target="_blank" rel="noopener noreferrer">
    <img src="https://vercel.com/button" alt="Deploy with Vercel" height="32" />
  </a>
  &nbsp;
  <a href="https://www.buymeacoffee.com/vucinatim" target="_blank" rel="noopener noreferrer">
    <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="30">
  </a>
</p>

VRM Studio is a lightweight, browser-based application for VTubing. It leverages the power of Google's MediaPipe for real-time tracking and Three.js for rendering 3D avatars, allowing you to become a VTuber with just a webcam.

![VRM Studio Screenshot](https://raw.githubusercontent.com/vucinatim/vrm-studio/refs/heads/main/public/images/screenshot.png)

## Using with OBS

To integrate VRM Studio with OBS for streaming or recording, follow these steps:

1.  **Configure VRM Studio:**
    *   Turn on the **Enable Green Screen** setting.
    *   Turn off the **Show Ground** setting.
    *   Enable the **Hide UI on Mouse Out** setting.
2.  **Set up the Window:** Move the VRM Studio browser window to a secondary monitor to keep it out of the way.
3.  **Add to OBS:**
    *   In OBS, add a new **Window Capture** source.
    *   Select the browser window with VRM Studio.
4.  **Refine the Capture:**
    *   Crop the window capture to only include the avatar. You can do this by holding `Alt` (or `Option` on Mac) and dragging the edges of the source in the OBS preview.
    *   Right-click the source in OBS and go to **Filters**.
    *   Add a **Chroma Key** filter. The default settings should work well with the green background.
5.  **Enjoy:** Position the final capture on your screen and enjoy your new VTuber setup!

## ✨ Features

*   **Real-time Tracking:** Utilizes Google MediaPipe's Holistic solution for simultaneous tracking of face, hands, and body pose.
*   **VRM Model Support:** Load your own VRM avatars.
*   **Green Screen:** A simple toggle provides a green screen background for easy chroma keying in OBS, Streamlabs, or other broadcasting software.
*   **Adjustable Motion Smoothing:** Implements a Kalman filter to smooth out tracking data, with a UI slider to control the amount of smoothing.
*   **In-Browser Controls:** An intuitive UI to control lighting, model selection, tracking parameters, and other scene settings.
*   **High Performance:** All the heavy lifting for tracking is done in a Web Worker to ensure a smooth UI and rendering experience.

## 🚀 Performance

The application is designed to be performant. On a MacBook M1, the core tracking process in the web worker typically takes between **30-50ms** per frame. The motion is smoothed using a Kalman filter, which is adjustable in the UI to balance responsiveness and stability.

## 🏗️ Architecture

This project is built with a modern web stack, focusing on modularity and performance.

*   **Framework:** [Next.js](https://nextjs.org/) (with App Router)
*   **3D Rendering:** [Three.js](https://threejs.org/) via [@react-three/fiber](https://github.com/pmndrs/react-three-fiber) and [@react-three/drei](https://github.com/pmndrs/drei).
*   **State Management:** [Zustand](https://github.com/pmndrs/zustand) for reactive global state.
*   **UI Components:** [shadcn/ui](https://ui.shadcn.com/) for a clean and accessible component library.
*   **Tracking Engine:** [Google MediaPipe](https://developers.google.com/mediapipe) Holistic tasks run inside a **Web Worker** to prevent blocking the main render loop. This is a key architectural decision that keeps the main thread free for rendering and UI updates.
*   **Rigging Logic:** The core logic for translating MediaPipe landmarks into VRM avatar movements is contained in `src/lib`. This includes solvers for inverse kinematics (IK), head orientation, blendshapes (facial expressions), and limb rigging.

## 🔧 Getting Started

To run this project locally:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/your-repo-name.git
    cd your-repo-name
    ```

2.  **Install dependencies:**
    This project uses `pnpm` as the package manager.
    ```bash
    pnpm install
    ```

3.  **Run the development server:**
    ```bash
    pnpm dev
    ```

4.  Open [http://localhost:3000](http://localhost:3000) in your browser.

##  roadmap

This is just the beginning! Here are some ideas for the future:

*   [ ] More robust face tracking and gestures.
*   [ ] Custom backgrounds (images/videos).
*   [ ] Saving and loading scene configurations.
*   [ ] OSC support for integration with other tools.

Contributions are welcome!

---

Built by [vucinatim](https://github.com/vucinatim). 