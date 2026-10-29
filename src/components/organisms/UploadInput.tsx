import { readDatasetFile } from '../../dataset/parse';
import { useAppStore } from '../../store/appStore';
import { FileButton } from '../molecules/FileButton';

/** "Upload file" button for a .txt or .csv of numbers (FR-003). */
export function UploadInput() {
  const loadUserDataset = useAppStore((s) => s.loadUserDataset);
  const setDataError = useAppStore((s) => s.setDataError);

  const load = async (file: File) => {
    const result = await readDatasetFile(file);
    if (result.ok) loadUserDataset(result.values, 'upload', file.name);
    else setDataError(result.error.message);
  };

  return (
    <FileButton
      label="Upload file"
      accept=".txt,.csv,text/plain,text/csv"
      onFile={(file) => void load(file)}
    />
  );
}
