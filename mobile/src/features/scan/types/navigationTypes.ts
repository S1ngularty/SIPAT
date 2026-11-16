import { UserStackParamList } from "../../../navigations/UserNavigation";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { AuthStackParamList } from "../../../navigations/AuthStackNavigation";

export type NavigationProp = NativeStackNavigationProp<UserStackParamList>;
export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
