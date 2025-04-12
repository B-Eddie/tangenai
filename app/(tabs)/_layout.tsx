import React, { useState } from "react";
import { Stack, Tabs } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../components/theme";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Animated,
} from "react-native";
import { usePathname, Link } from "expo-router";

export default function Layout() {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const [menuVisible, setMenuVisible] = useState(false);

  // Determine if we're on a phone-sized screen
  const isPhone = width < 768;

  // Pre-compute styles to avoid array syntax in JSX
  const getNavItemStyle = (path) => {
    return pathname === path || (path === "/" && pathname === "/index")
      ? { ...styles.navItem, ...styles.navItemActive }
      : styles.navItem;
  };

  const getNavTextStyle = (path) => {
    return pathname === path || (path === "/" && pathname === "/index")
      ? { ...styles.navText, ...styles.navTextActive }
      : styles.navText;
  };

  const getNavIconColor = (path) => {
    return pathname === path || (path === "/" && pathname === "/index")
      ? theme.colors.primary
      : "#333";
  };

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  // Menu items used in both desktop and mobile
  const renderMenuItems = (onPress = null) => (
    <>
      <Link href="/" asChild>
        <TouchableOpacity style={getNavItemStyle("/")} onPress={onPress}>
          <Ionicons
            name="search-outline"
            size={16}
            style={styles.navIcon}
            color={getNavIconColor("/")}
          />
          <Text style={getNavTextStyle("/")}>Search</Text>
        </TouchableOpacity>
      </Link>
      <Link href="/Explore" asChild>
        <TouchableOpacity style={getNavItemStyle("/Explore")} onPress={onPress}>
          <Ionicons
            name="compass-outline"
            size={16}
            style={styles.navIcon}
            color={getNavIconColor("/Explore")}
          />
          <Text style={getNavTextStyle("/Explore")}>Explore</Text>
        </TouchableOpacity>
      </Link>
      <Link href="/Watchlist" asChild>
        <TouchableOpacity
          style={getNavItemStyle("/Watchlist")}
          onPress={onPress}
        >
          <Ionicons
            name="bookmark-outline"
            size={16}
            style={styles.navIcon}
            color={getNavIconColor("/Watchlist")}
          />
          <Text style={getNavTextStyle("/Watchlist")}>Watchlist</Text>
        </TouchableOpacity>
      </Link>
    </>
  );

  return (
    <PaperProvider theme={theme}>
      <Tabs
        screenOptions={{
          tabBarStyle: { display: "none" }, // Hide the tab bar
          headerShown: true,
          header: ({ route }) => (
            <View style={styles.headerContainer}>
              <View style={styles.headerContent}>
                <View style={styles.logoContainer}>
                  <View style={styles.logoBox}>
                    <Text style={styles.logoText}>T</Text>
                  </View>
                  <Text style={styles.appName}>TangenAI</Text>
                </View>

                {isPhone ? (
                  <TouchableOpacity
                    onPress={toggleMenu}
                    style={styles.hamburgerButton}
                  >
                    <Ionicons
                      name={menuVisible ? "close-outline" : "menu-outline"}
                      size={24}
                      color="#333"
                    />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.navContainer}>{renderMenuItems()}</View>
                )}
              </View>

              {/* Mobile dropdown menu */}
              {isPhone && menuVisible && (
                <View style={styles.mobileMenu}>
                  {renderMenuItems(() => setMenuVisible(false))}
                </View>
              )}
            </View>
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Search",
          }}
        />
        <Tabs.Screen
          name="Explore"
          options={{
            title: "Explore",
          }}
        />
        <Tabs.Screen
          name="Watchlist"
          options={{
            title: "Watchlist",
          }}
        />
      </Tabs>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    width: "100%",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingTop: Platform.OS === "ios" ? 50 : 10,
    paddingBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 50,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoBox: {
    width: 32,
    height: 32,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  logoText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  appName: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
    color: "#333",
  },
  hamburgerButton: {
    padding: 8,
  },
  mobileMenu: {
    flexDirection: "column",
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  navContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginVertical: 2,
  },
  navItemActive: {
    backgroundColor: "rgba(255, 69, 0, 0.1)",
  },
  navIcon: {
    marginRight: 8,
  },
  navText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  navTextActive: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
});
