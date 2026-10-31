
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

const CLOUDINARY_CLOUD_NAME =
  process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;

const CLOUDINARY_UPLOAD_PRESET =
  process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const EMAILJS_SERVICE_ID =
  process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID;

const EMAILJS_TEMPLATE_ID =
  process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID;

const EMAILJS_PUBLIC_KEY =
  process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY;

const CATEGORIES = [
  "Account Problem",
  "Technical Issue",
  "Payment Concern",
  "Other",
];

export default function App() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Select an image from the phone gallery
  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow gallery access to upload a screenshot."
        );
        return;
      }

      const response =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          quality: 0.8,
        });

      if (!response.canceled && response.assets?.length > 0) {
        setSelectedImage(response.assets[0]);
        setResult(null);
      }
    } catch (error) {
      Alert.alert("Error", "Unable to open your image gallery.");
    }
  };

  // Upload selected image to Cloudinary
  const uploadToCloudinary = async (asset) => {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      throw new Error("Cloudinary configuration is missing.");
    }

    const formData = new FormData();

    const fileName =
      asset.fileName || `support_${Date.now()}.jpg`;

    const fileType = asset.mimeType || "image/jpeg";

    if (Platform.OS === "web" && asset.file) {
      formData.append("file", asset.file, fileName);
    } else {
      formData.append("file", {
        uri: asset.uri,
        name: fileName,
        type: fileType,
      });
    }

    formData.append(
      "upload_preset",
      CLOUDINARY_UPLOAD_PRESET
    );

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok || !data.secure_url) {
      throw new Error(
        data.error?.message || "Cloudinary image upload failed."
      );
    }

    return data.secure_url;
  };

  // Send support details using EmailJS
  const sendSupportEmail = async (imageUrl) => {
    if (
      !EMAILJS_SERVICE_ID ||
      !EMAILJS_TEMPLATE_ID ||
      !EMAILJS_PUBLIC_KEY
    ) {
      throw new Error("EmailJS configuration is missing.");
    }

    const emailData = {
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,

      template_params: {
        name: name.trim(),
        reply_to: email.trim(),
        issue_category: category,
        message: message.trim(),
        image_url: imageUrl,
      },
    };

    const response = await fetch(
      "https://api.emailjs.com/api/v1.0/email/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        errorText || "Unable to send support email."
      );
    }

    return true;
  };

  // Validate, upload image, and send email
  const submitTicket = async () => {
    if (loading) return;

    if (!name.trim() || !email.trim() || !category ||
        !message.trim()) {
      Alert.alert(
        "Incomplete Form",
        "Please complete all required fields."
      );
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.trim())) {
      Alert.alert(
        "Invalid Email",
        "Please enter a valid email address."
      );
      return;
    }

    if (!selectedImage) {
      Alert.alert(
        "Screenshot Required",
        "Please select a screenshot before submitting."
      );
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // STEP 1: Upload image first
      const imageUrl = await uploadToCloudinary(selectedImage);

      // STEP 2: Send email only after successful upload
      await sendSupportEmail(imageUrl);

      // STEP 3: Show success
      setResult({
        type: "success",
        text: "Your support ticket was sent successfully!",
      });

      Alert.alert(
        "Ticket Submitted!",
        "Your support request has been sent successfully."
      );

      // Clear form after successful submission
      setName("");
      setEmail("");
      setCategory("");
      setMessage("");
      setSelectedImage(null);

    } catch (error) {
      console.error("Submission error:", error);

      setResult({
        type: "error",
        text: error.message || "Something went wrong.",
      });

      Alert.alert(
        "Submission Failed",
        error.message || "Please try again."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>🎧</Text>
          <Text style={styles.headerTitle}>
            Support Ticket App - Team Project</Text>
          <Text style={styles.headerSubtitle}>
            We're here to help you!
          </Text>
        </View>

        {/* FORM */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            Submit a Request
          </Text>

          <Text style={styles.description}>
            Please provide the details of your concern.
          </Text>

          {/* NAME */}
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
            editable={!loading}
          />

          {/* EMAIL */}
          <Text style={styles.label}>Email Address *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email address"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          {/* CATEGORY */}
          <Text style={styles.label}>Issue Category *</Text>

          <View style={styles.categoryContainer}>
            {CATEGORIES.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.categoryButton,
                  category === item && styles.categorySelected,
                ]}
                onPress={() => {
                  setCategory(item);
                  setResult(null);
                }}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.categoryText,
                    category === item && styles.categoryTextSelected,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* MESSAGE */}
          <Text style={styles.label}>Message *</Text>
          <TextInput
            style={styles.messageInput}
            placeholder="Describe your problem here..."
            placeholderTextColor="#999"
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
            editable={!loading}
          />

          {/* IMAGE UPLOAD */}
          <Text style={styles.label}>Screenshot *</Text>

          <TouchableOpacity
            style={styles.uploadButton}
            onPress={pickImage}
            disabled={loading}
          >
            <Text style={styles.uploadIcon}>📷</Text>
            <Text style={styles.uploadText}>
              {selectedImage
                ? "Change Screenshot"
                : "Choose Screenshot"}
            </Text>
          </TouchableOpacity>

          {/* IMAGE PREVIEW */}
          {selectedImage && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewTitle}>
                Selected Image Preview
              </Text>

              <Image
                source={{ uri: selectedImage.uri }}
                style={styles.previewImage}
                resizeMode="contain"
              />

              <TouchableOpacity
                onPress={() => setSelectedImage(null)}
                disabled={loading}
              >
                <Text style={styles.removeText}>
                  ✕ Remove Screenshot
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* SUBMIT BUTTON */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.disabledButton,
            ]}
            onPress={submitTicket}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.submitText}>
                  Submitting Ticket...
                </Text>
              </View>
            ) : (
              <Text style={styles.submitText}>
                Submit Ticket
              </Text>
            )}
          </TouchableOpacity>

          {/* RESULT MESSAGE */}
          {result && (
            <View
              style={[
                styles.resultBox,
                result.type === "success"
                  ? styles.successBox
                  : styles.errorBox,
              ]}
            >
              <Text style={styles.resultText}>
                {result.type === "success" ? "✓ " : "⚠ "}
                {result.text}
              </Text>
            </View>
          )}

          <Text style={styles.footer}>
            Thank you for trusting our Support Team.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F7F2",
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },

  header: {
    backgroundColor: "#176B45",
    paddingTop: 55,
    paddingBottom: 35,
    paddingHorizontal: 20,
    alignItems: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  headerIcon: {
    fontSize: 45,
    marginBottom: 8,
  },

  headerTitle: {
    fontSize: 27,
    fontWeight: "bold",
    color: "#FFFFFF",
  },

  headerSubtitle: {
    fontSize: 14,
    color: "#D9F5E4",
    marginTop: 7,
  },

  formCard: {
    backgroundColor: "#FFFFFF",
    margin: 18,
    marginTop: -5,
    padding: 20,
    borderRadius: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },

  formTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#176B45",
  },

  description: {
    color: "#777",
    fontSize: 13,
    marginTop: 5,
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#24583E",
    marginBottom: 8,
    marginTop: 14,
  },

  input: {
    backgroundColor: "#F7FAF8",
    borderWidth: 1,
    borderColor: "#D9E8DE",
    borderRadius: 10,
    padding: 13,
    fontSize: 14,
    color: "#222",
  },

  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  categoryButton: {
    borderWidth: 1,
    borderColor: "#B9D8C5",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 5,
  },

  categorySelected: {
    backgroundColor: "#176B45",
    borderColor: "#176B45",
  },

  categoryText: {
    fontSize: 12,
    color: "#176B45",
    fontWeight: "600",
  },

  categoryTextSelected: {
    color: "#FFFFFF",
  },

  messageInput: {
    backgroundColor: "#F7FAF8",
    borderWidth: 1,
    borderColor: "#D9E8DE",
    borderRadius: 10,
    padding: 13,
    height: 115,
    fontSize: 14,
    color: "#222",
  },

  uploadButton: {
    backgroundColor: "#E7F5EC",
    borderWidth: 1,
    borderColor: "#8BC5A0",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
  },

  uploadIcon: {
    fontSize: 28,
    marginBottom: 6,
  },

  uploadText: {
    fontSize: 14,
    color: "#176B45",
    fontWeight: "bold",
  },

  previewContainer: {
    marginTop: 15,
    padding: 12,
    backgroundColor: "#F3F8F4",
    borderRadius: 12,
  },

  previewTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#176B45",
    marginBottom: 10,
  },

  previewImage: {
    width: "100%",
    height: 190,
    borderRadius: 10,
    backgroundColor: "#E5E5E5",
  },

  removeText: {
    color: "#D43D3D",
    textAlign: "center",
    marginTop: 12,
    fontWeight: "600",
  },

  submitButton: {
    backgroundColor: "#176B45",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 25,
  },

  disabledButton: {
    backgroundColor: "#82A995",
  },

  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  resultBox: {
    padding: 13,
    borderRadius: 10,
    marginTop: 15,
  },

  successBox: {
    backgroundColor: "#DDF5E5",
  },

  errorBox: {
    backgroundColor: "#FCE4E4",
  },

  resultText: {
    fontSize: 13,
    color: "#24583E",
    textAlign: "center",
  },

  footer: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    marginTop: 20,
  },
});
