interface File {
  text(): Promise<string>;
}
interface FileSystemFileHandle {
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream {
  write(data: BlobPart): Promise<void>;
  close(): Promise<void>;
}

type WindowWithFileSystemAPI = Window &
  typeof globalThis & {
    showOpenFilePicker: (
      options: ShowOpenFilePickerOptions
    ) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker: (
      options: ShowSaveFilePickerOptions
    ) => Promise<FileSystemFileHandle>;
  };
interface ShowOpenFilePickerOptions {
  types: {
    description?: string;
    accept: {
      [key: string]: string[];
    };
  }[];
  multiple: boolean;
}
interface ShowSaveFilePickerOptions {
  suggestedName?: string;
  types: {
    description?: string;
    accept: {
      [key: string]: string[];
    };
  }[];
  multiple: boolean;
  excludeAcceptAllOption?: boolean;
}

const savedBoardFileType = {
  description: "Saved board file",
  accept: {
    "application/json": [".json"],
  },
};

export async function loadFile(): Promise<string | null> {
  const w = window as WindowWithFileSystemAPI;
  const [fileHandle] = await w.showOpenFilePicker({
    types: [savedBoardFileType],
    multiple: false,
  });
  if (!fileHandle) return null;
  const file = await fileHandle.getFile();
  const text = await file.text();
  return text;
}

export async function saveFile(data: string): Promise<void> {
  const w = window as WindowWithFileSystemAPI;
  const handle = await w.showSaveFilePicker({
    types: [savedBoardFileType],
    multiple: false,
    suggestedName: "board.json",
  });
  if (!handle) return;

  const writableStream = await handle.createWritable();
  const blob = new Blob([data]);
  await writableStream.write(blob);
  await writableStream.close();
}
