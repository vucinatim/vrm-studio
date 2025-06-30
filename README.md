# VRM Studio

[![Deploy with Vercel](https://vercel.com/button)](https://vrm-studio.vercel.app/)

VRM Studio is a lightweight, browser-based application for VTubing. It leverages the power of Google's MediaPipe for real-time tracking and Three.js for rendering 3D avatars, allowing you to become a VTuber with just a webcam.

![VRM Studio Screenshot](https://raw.githubusercontent.com/vucinatim/vrm-studio/refs/heads/main/public/images/screenshot.png)

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