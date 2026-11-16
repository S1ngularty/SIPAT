import React from "react";
import {
  ActivityIndicator,
  KeyboardTypeOptions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  Check,
  ChevronLeft,
  ImagePlus,
  MapPin,
  Phone,
  Sprout,
  UserRound,
} from "lucide-react-native";
import { useEditProfile } from "../hooks/useEditProfile";
import { PREFERRED_CROPS } from "../profileTypes";
import showToast from "../../../helper/toast";

const COLORS = {
  background: "#F5F5F0",
  card: "#FFFFFF",
  border: "#E0E0E0",
  text: "#333333",
  textMuted: "#8A8A8A",
  green: "#2E7D32",
  greenSoft: "#E8F5E9",
  greenIcon: "#4CAF50",
  lime: "#D8F3A3",
  white: "#FFFFFF",
};

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  maxLength?: number;
}

const Field: React.FC<FieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "sentences",
  maxLength,
}) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textMuted}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      maxLength={maxLength}
      style={styles.input}
      selectionColor={COLORS.green}
    />
  </View>
);

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.card}>{children}</View>
  </View>
);

const EditProfileScreen: React.FC = () => {
  const {
    form,
    setField,
    toggleCrop,
    submit,
    isSaving,
    isLoading,
    error,
    refresh,
    navigation,
  } = useEditProfile();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
        >
          <ChevronLeft size={22} color={COLORS.text} strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <Text style={styles.headerSubtitle}>
            Keep your farmer profile up to date
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.green} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={refresh}
            style={styles.retryButton}
            accessibilityRole="button"
            accessibilityLabel="Retry loading profile"
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Profile photo placeholder — optional and not uploaded yet. */}
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={styles.avatarSection}
          >
            <Pressable
              style={styles.avatar}
              onPress={() =>
                showToast(
                  "info",
                  "Coming Soon",
                  "Profile photo uploads are not available yet.",
                )
              }
              accessibilityRole="imagebutton"
              accessibilityLabel="Profile photo placeholder"
            >
              <UserRound
                size={34}
                color={COLORS.greenIcon}
                strokeWidth={1.6}
              />
              <View style={styles.avatarBadge}>
                <ImagePlus
                  size={13}
                  color={COLORS.white}
                  strokeWidth={2}
                />
              </View>
            </Pressable>
            <Text style={styles.avatarTitle}>Profile photo (optional)</Text>
            <Text style={styles.avatarSubtitle}>
              Photo uploads are coming soon.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(400)}>
            <Section title="Personal Information">
              <Field
                label="Full name"
                value={form.name}
                onChangeText={(value) => setField("name", value)}
                placeholder="Enter your full name"
                autoCapitalize="words"
                maxLength={100}
              />

              <View style={styles.divider} />

              <View style={styles.fieldRow}>
                <View style={styles.fieldIconWrap}>
                  <Phone
                    size={16}
                    color={COLORS.greenIcon}
                    strokeWidth={1.8}
                  />
                </View>
                <View style={styles.fieldRowBody}>
                  <Field
                    label="Phone number"
                    value={form.phoneNumber}
                    onChangeText={(value) => setField("phoneNumber", value)}
                    placeholder="e.g. 0917 123 4567"
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    maxLength={20}
                  />
                </View>
              </View>
            </Section>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).duration(400)}>
            <Section title="Farm Location">
              <View style={styles.sectionHintRow}>
                <MapPin
                  size={15}
                  color={COLORS.greenIcon}
                  strokeWidth={1.8}
                />
                <Text style={styles.sectionHint}>
                  All fields are optional. Add what applies to your farm.
                </Text>
              </View>

              <Field
                label="Province"
                value={form.province}
                onChangeText={(value) => setField("province", value)}
                placeholder="e.g. Laguna"
                autoCapitalize="words"
                maxLength={100}
              />
              <Field
                label="Municipality / City"
                value={form.municipality}
                onChangeText={(value) => setField("municipality", value)}
                placeholder="e.g. Los Baños"
                autoCapitalize="words"
                maxLength={100}
              />
              <Field
                label="Barangay"
                value={form.barangay}
                onChangeText={(value) => setField("barangay", value)}
                placeholder="e.g. Batong Malake"
                autoCapitalize="words"
                maxLength={100}
              />
            </Section>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(240).duration(400)}>
            <Section title="Preferred Crops">
              <View style={styles.sectionHintRow}>
                <Sprout
                  size={15}
                  color={COLORS.greenIcon}
                  strokeWidth={1.8}
                />
                <Text style={styles.sectionHint}>
                  Select the crops you grow most often.
                </Text>
              </View>

              <View style={styles.chipRow}>
                {PREFERRED_CROPS.map((crop) => {
                  const selected = form.preferredCrops.includes(crop.value);

                  return (
                    <TouchableOpacity
                      key={crop.value}
                      onPress={() => toggleCrop(crop.value)}
                      activeOpacity={0.75}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={crop.label}
                      style={[
                        styles.chip,
                        selected && styles.chipSelected,
                      ]}
                    >
                      {selected ? (
                        <Check
                          size={13}
                          color={COLORS.green}
                          strokeWidth={2.6}
                        />
                      ) : null}
                      <Text
                        style={[
                          styles.chipText,
                          selected && styles.chipTextSelected,
                        ]}
                      >
                        {crop.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Section>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(320).duration(400)}>
            <TouchableOpacity
              onPress={submit}
              activeOpacity={0.8}
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityLabel="Save profile"
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            >
              {isSaving ? (
                <ActivityIndicator color={COLORS.green} />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.green,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.greenSoft,
  },
  retryText: {
    color: COLORS.green,
    fontSize: 14,
    fontWeight: "600",
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 20,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: COLORS.greenSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.card,
  },
  avatarTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  avatarSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666666",
    marginBottom: 8,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 14,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
  },
  fieldRow: {
    flexDirection: "row",
    gap: 10,
  },
  fieldIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  fieldRowBody: {
    flex: 1,
  },
  sectionHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionHint: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.lime,
    borderColor: COLORS.green,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  chipTextSelected: {
    color: COLORS.green,
  },
  saveButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.lime,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.green,
  },
});

export default EditProfileScreen;
