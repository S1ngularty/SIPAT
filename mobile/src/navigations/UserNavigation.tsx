import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeTabNavigator, { TabParamList } from "./HomeTabNavigation";
import VideoScanningScreen from "../features/scan/screens/VideoScanning";
import VideoPreviewScreen from "../features/scan/screens/VideoPreview";
import { DiagnosisDetailScreen } from "../features/diagnosis/screens/DiagnosisDetailScreen";
import { EvidencePreviewScreen } from "../features/diagnosis/screens/EvidencePreviewScreen";
import { NavigatorScreenParams } from "@react-navigation/native";

export type UserStackParamList = {
  HomeTabs: NavigatorScreenParams<TabParamList>;
  VideoScanning: undefined;
  VideoPreview: {
    videoUri: string;
  };
  DiagnosisDetail: {
    videoId: string;
  };
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
};

const UserStack = createNativeStackNavigator<UserStackParamList>();

export default function UserNavigation() {
  return (
    <UserStack.Navigator screenOptions={{ headerShown: false }}>
      <UserStack.Screen component={HomeTabNavigator} name="HomeTabs" />
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
        component={EvidencePreviewScreen}
        name="EvidencePreview"
        options={{
          animation: "slide_from_right", // Optional: nice animation for scanner
        }}
      />
    </UserStack.Navigator>
  );
}
