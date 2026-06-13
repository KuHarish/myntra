/**
 * PasswordInput - Cross-platform password field.
 *
 * WHY TWO INPUTS:
 * React Native Web translates `secureTextEntry` to the HTML `type` attribute.
 * Toggling `type` on an already-mounted <input> causes browsers to freeze/reset
 * the field (cursor stuck, text cleared). The only reliable fix is to mount a
 * FRESH element for each mode — one with type="password", one with type="text".
 */

import React, { useState, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  type TextInputProps,
} from "react-native";
import { Eye, EyeOff } from "lucide-react-native";

interface PasswordInputProps extends Omit<TextInputProps, "secureTextEntry"> {
  containerStyle?: object;
  hasError?: boolean;
}

export function PasswordInput({
  containerStyle,
  hasError,
  style,
  value,
  onChangeText,
  placeholder,
  placeholderTextColor,
  ...rest
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const commonProps: TextInputProps = {
    style: [styles.input, style],
    value,
    onChangeText,
    placeholder,
    placeholderTextColor: placeholderTextColor ?? "#aaa",
    autoCorrect: false,
    autoCapitalize: "none",
    ...rest,
  };

  return (
    <View
      style={[
        styles.container,
        hasError ? styles.containerError : null,
        containerStyle,
      ]}
    >
      {/*
       * Two separate TextInput instances — one secure, one plain.
       * We mount/unmount them rather than toggling secureTextEntry on
       * the same node to avoid the React Native Web type-switch freeze.
       */}
      {showPassword ? (
        <TextInput
          key="plain"
          {...commonProps}
          secureTextEntry={false}
          autoComplete={Platform.OS === "web" ? "current-password" : "password"}
        />
      ) : (
        <TextInput
          key="secure"
          {...commonProps}
          secureTextEntry={true}
          autoComplete={Platform.OS === "web" ? "current-password" : "password"}
        />
      )}

      <TouchableOpacity
        style={styles.toggle}
        onPress={() => setShowPassword((v) => !v)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {showPassword ? (
          <EyeOff size={20} color="#888" />
        ) : (
          <Eye size={20} color="#888" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f7f8",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#ebebeb",
  },
  containerError: {
    borderColor: "#ff3f6c",
    backgroundColor: "#fff6f8",
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 15,
    color: "#1a1a1a",
  },
  toggle: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
});
