import React, { useState } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import type { AfricanCountry } from "../../data/countries";
import { landingColors } from "../../constants/landing";

export default function CountryFlag({
  country,
  size = 30,
}: {
  country: AfricanCountry;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <View
      style={{
        width: size,
        height: Math.round(size * 0.7),
        borderRadius: 5,
        overflow: "hidden",
        backgroundColor: landingColors.panelRaised,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {failed ? (
        <Text style={{ fontSize: size * 0.55 }}>{country.flag}</Text>
      ) : (
        <Image
          source={{ uri: country.flagUrl }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={120}
          onError={() => setFailed(true)}
          accessibilityLabel={`${country.name} flag`}
        />
      )}
    </View>
  );
}
