import * as ImagePicker from 'expo-image-picker';
import { IImagePickerService } from '../../domain/ports/IImagePickerService';

export class ExpoImagePickerAdapter implements IImagePickerService {
  async pickImageFromGallery(): Promise<string | null> {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0].uri;
    }
    return null;
  }

  async takePhotoWithCamera(): Promise<string | null> {
    const permissionResult =
      await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0].uri;
    }
    return null;
  }
}
