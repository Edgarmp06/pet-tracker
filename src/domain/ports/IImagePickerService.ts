export interface IImagePickerService {
  pickImageFromGallery(): Promise<string | null>;
  takePhotoWithCamera(): Promise<string | null>;
}
