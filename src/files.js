import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { FilePicker } from "@capawesome/capacitor-file-picker";

const isNative = Capacitor.isNativePlatform();

function decodeBase64(data) {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder("utf-8").decode(bytes);
}

// Open a .bpmn/.xml file and return { name, xml }, or null if cancelled.
// Uses the native file picker on device and a hidden <input> in the browser.
export async function openFile() {
  if (isNative) {
    const result = await FilePicker.pickFiles({ readData: true });
    const file = result.files && result.files[0];
    if (!file) return null;
    const xml =
      typeof file.data === "string" ? decodeBase64(file.data) : "";
    return { name: file.name || "diagram.bpmn", xml };
  }

  return new Promise((resolve) => {
    const input = document.getElementById("file-input");
    const cleanup = () => {
      input.removeEventListener("change", onChange);
      input.value = "";
    };
    const onChange = () => {
      const file = input.files && input.files[0];
      if (!file) {
        cleanup();
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        cleanup();
        resolve({ name: file.name, xml: String(reader.result) });
      };
      reader.onerror = () => {
        cleanup();
        resolve(null);
      };
      reader.readAsText(file);
    };
    input.addEventListener("change", onChange);
    input.click();
  });
}

// Persist `content` to a file and offer to share it. On device the file is
// written to the app's Documents directory and handed to the share sheet; in
// the browser it is downloaded.
export async function saveFile(name, content, mimeType = "application/xml") {
  if (isNative) {
    await Filesystem.writeFile({
      path: name,
      data: content,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    const uri = await Filesystem.getUri({
      path: name,
      directory: Directory.Documents,
    });
    try {
      await Share.share({ title: name, url: uri.uri });
    } catch (err) {
      // The user dismissing the share sheet throws; the file is already
      // saved to Documents, so treat a dismissal as success.
    }
    return uri.uri;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return name;
}
