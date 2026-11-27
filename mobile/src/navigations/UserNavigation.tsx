import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeTabNavigator, { TabParamList } from "./HomeTabNavigation";
import VideoScanningScreen from "../features/scan/screens/VideoScanning";
import VideoPreviewScreen from "../features/scan/screens/VideoPreview";
import { DiagnosisDetailScreen } from "../features/diagnosis/screens/DiagnosisDetailScreen";
import { EvidencePreviewScreen } from "../features/diagnosis/screens/EvidencePreviewScreen";
import { CropProblemsScreen } from "../features/crop-problems/screens/CropProblemsScreen";
import { CropProblemDetailScreen } from "../features/crop-problems/screens/CropProblemDetailScreen";
import { ChatMessagesScreen } from "../features/chat/screens/ChatMessagesScreen";
import { ChatProvider } from "../features/chat/ChatProvider";
import EditProfileScreen from "../features/profile/screen/EditProfileScreen";
import ChangePasswordScreen from "../features/profile/screen/ChangePasswordScreen";
import { NavigatorScreenParams } from "@react-navigation/native";

export type UserStackParamList = {
  HomeTabs: NavigatorScreenParams<TabParamList>;
  Chat: undefined;
  VideoScanning: undefined;
  VideoPreview: {
    videoUri: string;
    /** True when the clip came from the gallery (so it has no capture location). */
    uploaded: boolean;
    /**
     * Set by the recorder/sync service when the video was already uploaded or
     * saved to the local queue. The preview then never uploads it a second time.
     */
    uploadState?: "uploaded" | "queued";
    /** Row id in the local SQLite queue, when this clip went through it. */
    localVideoId?: string;
    /** Backend video id, when the clip was uploaded immediately. */
    videoId?: string;
  };
  DiagnosisDetail: {
    videoId: string;
  };
  EditProfile: undefined;
  ChangePassword: undefined;
  EvidencePreview: {
    crop: string;
    condition: string;
    detections: {
      _id: string;
      trackId: number;
      crop: string;
      condition: string;
      confidence: number;
      duration: number;
      observations: number;
      evidenceKey: string;
      evidenceUrl: string;
    }[];
  };
  /** Offline crop-care browser, optionally pre-filtered from a Home shortcut. */
  CropProblems: { query?: string } | undefined;
  /** One guide record from the bundled crop-problem data. */
  CropProblemDetail: { id: string };
};

const UserStack = createNativeStackNavigator<UserStackParamList>();

export default function UserNavigation() {
  return (
    <ChatProvider>
      <UserStack.Navigator screenOptions={{ headerShown: false }}>
        <UserStack.Screen component={HomeTabNavigator} name="HomeTabs" />
        <UserStack.Screen
          component={ChatMessagesScreen}
          name="Chat"
          options={{
            animation: "slide_from_right",
          }}
        />
        <UserStack.Screen
          component={VideoScanningScreen}
          name="VideoScanning"
          options={{
            animation: "slide_from_left", // Optional: nice animation for scanner
          }}
        />
        <UserStack.Screen
          component={VideoPreviewScreen}
          name="VideoPreview"
          options={{
            animation: "slide_from_left", // Optional: nice animation for scanner
          }}
        />
        <UserStack.Screen
          component={DiagnosisDetailScreen}
          name="DiagnosisDetail"
          options={{
            animation: "slide_from_right", // Optional: nice animation for scanner
          }}
        />
        <UserStack.Screen
          component={EditProfileScreen}
          name="EditProfile"
          options={{
            animation: "slide_from_right",
          }}
        />
        <UserStack.Screen
          component={ChangePasswordScreen}
          name="ChangePassword"
          options={{
            animation: "slide_from_right",
          }}
        />
        <UserStack.Screen
          component={EvidencePreviewScreen}
          name="EvidencePreview"
          options={{
            animation: "slide_from_right", // Optional: nice animation for scanner
          }}
        />
        <UserStack.Screen
          component={CropProblemsScreen}
          name="CropProblems"
          options={{
            animation: "slide_from_right",
          }}
        />
        <UserStack.Screen
          component={CropProblemDetailScreen}
          name="CropProblemDetail"
          options={{
            animation: "slide_from_right",
          }}
        />
      </UserStack.Navigator>
    </ChatProvider>
  );
}
