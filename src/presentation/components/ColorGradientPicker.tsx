import React, { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';

interface Props {
  selectedHexColor: string;
  onColorChange: (hexColor: string) => void;
}

// Añadimos 'as const' para que TypeScript infiera la tupla exacta requerida por LinearGradient
const GRADIENT_COLORS = [
  '#6D4C41', // Marrón oscuro
  '#A1887F', // Marrón claro
  '#FBC02D', // Amarillento
  '#388E3C', // Verdoso
  '#212121', // Oscuro / Negro
] as const;

// Convierte Hex a RGB
const hexToRgb = (hex: string) => {
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
};

// Convierte RGB a Hex
const rgbToHex = (r: number, g: number, b: number) => {
  return (
    '#' +
    [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')
  );
};

// Interpola dinámicamente entre el espectro de colores
const interpolateColor = (val: number) => {
  const numSections = GRADIENT_COLORS.length - 1;
  const scaledVal = val * numSections;
  const index = Math.min(Math.floor(scaledVal), numSections - 1);
  const factor = scaledVal - index;

  const color1 = hexToRgb(GRADIENT_COLORS[index]);
  const color2 = hexToRgb(GRADIENT_COLORS[index + 1]);

  const r = color1.r + factor * (color2.r - color1.r);
  const g = color1.g + factor * (color2.g - color1.g);
  const b = color1.b + factor * (color2.b - color1.b);

  return rgbToHex(r, g, b);
};

export const ColorGradientPicker: React.FC<Props> = ({ onColorChange }) => {
  const [sliderValue, setSliderValue] = useState(0);
  const [currentHex, setCurrentHex] = useState<string>(GRADIENT_COLORS[0]);

  const handleValueChange = (val: number) => {
    setSliderValue(val);
    const hex = interpolateColor(val);
    setCurrentHex(hex);
    onColorChange(hex);
  };

  return (
    <View style={styles.container}>
      <View style={styles.previewContainer}>
        <View style={[styles.colorPreview, { backgroundColor: currentHex }]} />
        <Text style={styles.hexText}>{currentHex.toUpperCase()}</Text>
      </View>

      <View style={styles.barWrapper}>
        <LinearGradient
          colors={GRADIENT_COLORS as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradientBar}
        />
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={1}
          value={sliderValue}
          onValueChange={handleValueChange}
          minimumTrackTintColor="transparent"
          maximumTrackTintColor="transparent"
          thumbTintColor="#FFFFFF"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', marginVertical: 10 },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorPreview: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  hexText: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  barWrapper: { height: 30, justifyContent: 'center', position: 'relative' },
  gradientBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 16,
    borderRadius: 8,
  },
  slider: { width: '100%', height: 40 },
});
