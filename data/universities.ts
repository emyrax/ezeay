export interface UniversityEntry {
  name: string;
  country: string;
  state?: string;
  shortName?: string;
}

export const UNIVERSITIES_DATA: Record<string, Record<string, string[]>> = {
  Nigeria: {
    Lagos: [
      "University of Lagos (UNILAG)",
      "Lagos State University (LASU)",
      "Pan-Atlantic University (PAU)",
      "Yaba College of Technology (YABATECH)",
      "Lagos State University of Science and Technology (LASUSTECH)",
      "Lagos State University of Education (LASUED)",
      "Caleb University",
      "Anchor University",
      "Augustine University",
    ],
    "Abuja (FCT)": [
      "University of Abuja (UNIABUJA)",
      "Nile University of Nigeria",
      "Baze University",
      "African University of Science and Technology (AUST)",
      "Veritas University",
      "Philomath University",
      "Bingham University (Karù/Abuja Axis)",
    ],
    Oyo: [
      "University of Ibadan (UI)",
      "Ladoke Akintola University of Technology (LAUTECH)",
      "Lead City University",
      "Ajayi Crowther University",
      "Koladaisi University",
      "Dominican University",
      "Atiba University",
      "The Polytechnic, Ibadan",
    ],
    Ogun: [
      "Covenant University",
      "Babcock University",
      "Federal University of Agriculture, Abeokuta (FUNAAB)",
      "Olabisi Onabanjo University (OOU)",
      "Bells University of Technology",
      "Tai Solarin University of Education (TASUED)",
      "Crawford University",
      "Mountain Top University",
      "Chrisland University",
      "Moshood Abiola Polytechnic (MAPOLY)",
    ],
    Rivers: [
      "University of Port Harcourt (UNIPORT)",
      "Rivers State University (RSU)",
      "Ignatius Ajuru University of Education (IAUE)",
      "PAMO University of Medical Sciences",
      "Captain Elechi Amadi Polytechnic",
    ],
    Enugu: [
      "University of Nigeria, Nsukka (UNN)",
      "Enugu State University of Science and Technology (ESUT)",
      "Godfrey Okoye University",
      "Caritas University",
      "Coal City University",
      "Renaissance University",
      "Institute of Management and Technology (IMT)",
    ],
    Edo: [
      "University of Benin (UNIBEN)",
      "Ambrose Alli University (AAU)",
      "Igbinedion University Okada",
      "Benson Idahosa University (BIU)",
      "Edo State University Uzairue",
      "Wellspring University",
    ],
    Kaduna: [
      "Ahmadu Bello University (ABU Zaria)",
      "Kaduna State University (KASU)",
      "Air Force Institute of Technology (AFIT)",
      "Greenfield University",
      "Kaduna Polytechnic",
    ],
    Kano: [
      "Bayero University Kano (BUK)",
      "Kano University of Science and Technology (KUST Wudil)",
      "Yusuf Maitama Sule University (NWU)",
      "Skyline University Nigeria",
      "Maryam Abacha American University of Nigeria",
    ],
    Anambra: [
      "Nnamdi Azikiwe University (UNIZIK)",
      "Chukwuemeka Odumegwu Ojukwu University (COOU)",
      "Madonna University",
      "Paul University",
      "Legacy University Okija",
      "Federal Polytechnic Oko",
    ],
    Delta: [
      "Delta State University (DELSU Abraka)",
      "Federal University of Petroleum Resources Effurun (FUPRE)",
      "University of Delta (UNIDEL Agbor)",
      "Dennis Osadebay University Asaba",
      "Western Delta University",
      "Novena University",
    ],
    Kwara: [
      "University of Ilorin (UNILORIN)",
      "Kwara State University (KWASU)",
      "Landmark University",
      "Al-Hikmah University",
      "Summit University Offa",
      "Crown-Hill University",
      "Federal Polytechnic Offa",
    ],
    Osun: [
      "Obafemi Awolowo University (OAU Ile-Ife)",
      "Osun State University (UNIOSUN)",
      "Bowen University Iwo",
      "Adeleke University Ede",
      "Redeemer's University Ede",
      "Fountain University Osogbo",
      "Osun State Polytechnic Iree",
    ],
    Plateau: [
      "University of Jos (UNIJOS)",
      "Plateau State University (PLASU)",
      "Karl Kumm University Vom",
      "Plateau State Polytechnic",
    ],
    Ondo: [
      "Federal University of Technology Akure (FUTA)",
      "Adekunle Ajasin University (AAUA)",
      "Ondo State University of Science and Technology (OSUSTECH)",
      "University of Medical Sciences (UNIMED Ondo)",
      "Achievers University Owo",
      "Elizade University Ilara-Mokin",
    ],
    Imo: [
      "Federal University of Technology Owerri (FUTO)",
      "Imo State University (IMSU)",
      "Hezekiah University",
      "Federal Polytechnic Nekede",
    ],
    "Akwa Ibom": [
      "University of Uyo (UNIUYO)",
      "Akwa Ibom State University (AKSU)",
      "Ritman University",
      "Obong University",
      "Topfaith University",
    ],
    "Cross River": [
      "University of Calabar (UNICAL)",
      "Cross River University of Technology (CRUTECH)",
      "Arthur Jarvis University",
    ],
    Borno: [
      "University of Maiduguri (UNIMAID)",
      "Borno State University",
      "Ramat Polytechnic",
    ],
    Benue: [
      "Federal University of Agriculture Makurdi (FUAM / Joseph Sarwuan Tarka University)",
      "Benue State University (BSU)",
      "University of Mkar",
    ],
    Abia: [
      "Abia State University (ABSU Uturu)",
      "Michael Okpara University of Agriculture Umudike (MOUAU)",
      "Gregory University Uturu",
      "Clifford University",
    ],
    Ekiti: [
      "Ekiti State University (EKSU)",
      "Federal University Oye-Ekiti (FUOYE)",
      "Afe Babalola University (ABUAD)",
    ],
    Bauchi: [
      "Abubakar Tafawa Balewa University (ATBU)",
      "Bauchi State University Gadau (BASUG)",
    ],
    Nasarawa: [
      "Federal University of Lafia (FULafia)",
      "Nasarawa State University Keffi (NSUK)",
    ],
  },
  Kenya: {
    Nairobi: [
      "University of Nairobi (UoN)",
      "Strathmore University",
      "Kenyatta University (KU)",
      "United States International University Africa (USIU-Africa)",
      "Daystar University",
      "Technical University of Kenya (TUK)",
      "Pan Africa Christian University",
      "KCA University",
      "Catholic University of Eastern Africa (CUEA)",
    ],
    Kiambu: [
      "Jomo Kenyatta University of Agriculture and Technology (JKUAT)",
      "Mount Kenya University (MKU)",
      "Zetech University",
      "Gretsa University",
    ],
    "Uasin Gishu": [
      "Moi University",
      "University of Eldoret",
      "Catholic University of Eastern Africa (Gaba Campus)",
    ],
    Nakuru: [
      "Egerton University",
      "Kabarak University",
    ],
    Kisumu: [
      "Maseno University",
      "Great Lakes University of Kisumu",
    ],
    Mombasa: [
      "Technical University of Mombasa (TUM)",
    ],
    Machakos: [
      "Machakos University",
      "Daystar University (Athi River Campus)",
      "Lukenya University",
    ],
    Nyeri: [
      "Dedan Kimathi University of Technology (DeKUT)",
    ],
    Kakamega: [
      "Masinde Muliro University of Science and Technology (MMUST)",
    ],
  },
  Ghana: {
    "Greater Accra": [
      "University of Ghana (Legon)",
      "Ashesi University",
      "Ghana Institute of Management and Public Administration (GIMPA)",
      "Accra Technical University",
      "Academic City University College",
      "Lancaster University Ghana",
      "Wisconsin International University College",
      "Pentecost University",
      "Valley View University",
      "Central University (Miotso/Accra)",
    ],
    Ashanti: [
      "Kwame Nkrumah University of Science and Technology (KNUST)",
      "Kumasi Technical University",
      "Christian Service University College",
      "Garden City University College",
    ],
    Central: [
      "University of Cape Coast (UCC)",
      "University of Education, Winneba (UEW)",
      "Cape Coast Technical University",
    ],
    Northern: [
      "University for Development Studies (UDS Tamale)",
      "Tamale Technical University",
    ],
    Eastern: [
      "Koforidua Technical University",
      "All Nations University",
    ],
    Western: [
      "University of Mines and Technology (UMaT Tarkwa)",
      "Takoradi Technical University",
    ],
  },
  "South Africa": {
    "Western Cape": [
      "University of Cape Town (UCT)",
      "Stellenbosch University",
      "University of the Western Cape (UWC)",
      "Cape Peninsula University of Technology (CPUT)",
    ],
    Gauteng: [
      "University of the Witwatersrand (Wits)",
      "University of Pretoria (UP)",
      "University of Johannesburg (UJ)",
      "University of South Africa (UNISA)",
      "Tshwane University of Technology (TUT)",
      "Sefako Makgatho Health Sciences University (SMU)",
      "Vaal University of Technology (VUT)",
    ],
    "KwaZulu-Natal": [
      "University of KwaZulu-Natal (UKZN)",
      "Durban University of Technology (DUT)",
      "University of Zululand (UNIZULU)",
      "Mangosuthu University of Technology (MUT)",
    ],
    "Eastern Cape": [
      "Rhodes University",
      "Nelson Mandela University (NMU)",
      "University of Fort Hare (UFH)",
      "Walter Sisulu University (WSU)",
    ],
    "Free State": [
      "University of the Free State (UFS)",
      "Central University of Technology (CUT)",
    ],
    Limpopo: [
      "University of Limpopo",
      "University of Venda (UNIVEN)",
    ],
    "North West": [
      "North-West University (NWU)",
    ],
  },
  Egypt: {
    Cairo: [
      "Cairo University",
      "The American University in Cairo (AUC)",
      "Ain Shams University",
      "Al-Azhar University",
      "German University in Cairo (GUC)",
      "Helwan University",
      "British University in Egypt (BUE)",
      "Future University in Egypt (FUE)",
    ],
    Giza: [
      "Nile University",
      "October 6 University",
      "Misr University for Science and Technology (MUST)",
      "Ahram Canadian University (ACU)",
    ],
    Alexandria: [
      "Alexandria University",
      "Arab Academy for Science, Technology and Maritime Transport (AASTMT)",
      "Egypt-Japan University of Science and Technology (E-JUST)",
      "Pharos University in Alexandria (PUA)",
    ],
    Dakahlia: [
      "Mansoura University",
      "Delta University for Science and Technology",
    ],
    Asyut: [
      "Assiut University",
      "Sphinx University",
    ],
  },
  Rwanda: {
    "Kigali City": [
      "University of Rwanda (UR - Gikondo & Remera)",
      "African Leadership University (ALU Rwanda)",
      "Carnegie Mellon University Africa (CMU-Africa)",
      "Mount Kenya University Rwanda",
      "University of Kigali (UoK)",
      "Aventist University of Central Africa (AUCA)",
      "Kepler College",
    ],
    "Southern Province": [
      "University of Rwanda (Huye Campus)",
      "University of Technology and Arts of Byumba (UTAB)",
    ],
    "Eastern Province": [
      "University of Rwanda (Rwamagana/Nyagatare)",
      "University of Global Health Equity (UGHE Butaro)",
    ],
  },
  Uganda: {
    "Central (Kampala)": [
      "Makerere University",
      "Kyambogo University",
      "Kampala International University (KIU)",
      "Cavendish University Uganda",
      "Victoria University Uganda",
      "ISBAT University",
      "Clarke International University",
    ],
    "Central (Wakiso & Mukono)": [
      "Uganda Christian University (UCU Mukono)",
      "Nkumba University",
      "Uganda Martyrs University (UMU Nkozi)",
    ],
    "Western (Mbarara & Kabale)": [
      "Mbarara University of Science and Technology (MUST)",
      "Kabale University",
      "Bishop Stuart University",
    ],
    "Northern (Gulu & Lira)": [
      "Gulu University",
      "Lira University",
      "Muni University (Arua)",
    ],
    "Eastern (Jinja & Mbale)": [
      "Busitema University",
      "Islamic University in Uganda (IUIU Mbale)",
    ],
  },
  Tanzania: {
    "Dar es Salaam": [
      "University of Dar es Salaam (UDSM)",
      "Ardhi University (ARU)",
      "Muhimbili University of Health and Allied Sciences (MUHAS)",
      "Open University of Tanzania (OUT)",
      "Hubert Kairuki Memorial University (HKMU)",
      "Institute of Finance Management (IFM)",
    ],
    Dodoma: [
      "University of Dodoma (UDOM)",
      "St. John's University of Tanzania (SJUT)",
    ],
    Morogoro: [
      "Sokoine University of Agriculture (SUA)",
      "Mzumbe University",
    ],
    Arusha: [
      "Nelson Mandela African Institution of Science and Technology (NM-AIST)",
      "University of Arusha",
    ],
    Mwanza: [
      "Catholic University of Health and Allied Sciences (CUHAS)",
      "St. Augustine University of Tanzania (SAUT)",
    ],
  },
  Ethiopia: {
    "Addis Ababa": [
      "Addis Ababa University (AAU)",
      "Addis Ababa Science and Technology University (AASTU)",
      "St. Mary's University",
      "Unity University",
    ],
    Oromia: [
      "Jimma University",
      "Haramaya University",
      "Adama Science and Technology University (ASTU)",
      "Ambo University",
    ],
    Amhara: [
      "Bahir Dar University",
      "University of Gondar",
      "Debre Markos University",
    ],
    Tigray: [
      "Mekelle University",
    ],
    Sidama: [
      "Hawassa University",
    ],
  },
  Cameroon: {
    "Centre (Yaoundé)": [
      "University of Yaoundé I",
      "University of Yaoundé II (Soa)",
      "Catholic University of Central Africa (UCAC)",
      "Siantou University Institute",
    ],
    "Littoral (Douala)": [
      "University of Douala",
      "Douala Institute of Technology",
    ],
    "Southwest (Buea)": [
      "University of Buea",
      "Catholic University Institute of Buea (CUIB)",
    ],
    "Northwest (Bamenda)": [
      "University of Bamenda",
    ],
  },
  Senegal: {
    Dakar: [
      "Cheikh Anta Diop University (UCAD Dakar)",
      "Amadou Mahtar Mbow University (UAM)",
      "BEM Management School Dakar",
      "ISM University (Institut Supérieur de Management)",
    ],
    "Saint-Louis": [
      "Gaston Berger University (UGB)",
    ],
    Thiès: [
      "University of Thiès",
    ],
  },
  Morocco: {
    "Rabat-Salé-Kénitra": [
      "Mohammed V University in Rabat",
      "International University of Rabat (UIR)",
      "Ibn Tofail University (Kénitra)",
    ],
    "Casablanca-Settat": [
      "Hassan II University of Casablanca",
      "Hassan 1st University (Settat)",
      "Mundiapolis University",
    ],
    "Marrakech-Safi": [
      "Cadi Ayyad University (UCA)",
    ],
    "Fès-Meknès": [
      "Sidi Mohamed Ben Abdellah University (Fès)",
      "Al Akhawayn University (AUI Ifrane)",
      "Moulay Ismail University (Meknès)",
    ],
  },
};

const NATIONWIDE_FALLBACKS: Record<string, string[]> = {
  Zimbabwe: [
    "University of Zimbabwe (UZ)",
    "National University of Science and Technology (NUST Bulawayo)",
    "Midlands State University (MSU)",
    "Africa University (AU Mutare)",
    "Chinhoyi University of Technology (CUT)",
    "Great Zimbabwe University (GZU)",
    "Harare Institute of Technology (HIT)",
  ],
  Zambia: [
    "University of Zambia (UNZA Lusaka)",
    "Copperbelt University (CBU Kitwe)",
    "Mulungushi University (Kabwe)",
    "Cavendish University Zambia",
    "Zambia Catholic University",
  ],
  "Côte d'Ivoire": [
    "Université Félix Houphouët-Boigny (Abidjan)",
    "Université Nangui Abrogoua (Abidjan)",
    "Institut National Polytechnique Félix Houphouët-Boigny (INP-HB Yamoussoukro)",
    "Université Alassane Ouattara (Bouaké)",
  ],
  Botswana: [
    "University of Botswana (UB Gaborone)",
    "Botswana International University of Science and Technology (BIUST)",
    "Botho University",
    "BA ISAGO University",
  ],
  Namibia: [
    "University of Namibia (UNAM)",
    "Namibia University of Science and Technology (NUST)",
    "International University of Management (IUM)",
  ],
  Mauritius: [
    "University of Mauritius (UoM Réduit)",
    "University of Technology Mauritius (UTM)",
    "Middlesex University Mauritius",
    "Curtin Mauritius",
  ],
  Mozambique: [
    "Eduardo Mondlane University (UEM Maputo)",
    "Pedagogical University of Maputo (UP)",
    "Lúrio University (UniLúrio Nampula)",
    "Zambeze University (UniZambeze Beira)",
  ],
  Angola: [
    "Agostinho Neto University (UAN Luanda)",
    "Catholic University of Angola (UCAN)",
    "José Eduardo dos Santos University (Huambo)",
    "Katyavala Bwila University (Benguela)",
  ],
  "DR Congo": [
    "University of Kinshasa (UNIKIN)",
    "University of Lubumbashi (UNILU)",
    "Protestant University in the Congo (UPC Kinshasa)",
    "Catholic University of the Congo (UCC)",
    "University of Kisangani (UNIKIS)",
  ],
  Sudan: [
    "University of Khartoum",
    "Sudan University of Science and Technology",
    "Al-Neelain University",
    "Future University Sudan",
  ],
  Algeria: [
    "University of Algiers 1 (Benyoucef Benkhedda)",
    "University of Science and Technology Houari Boumediene (USTHB)",
    "University of Oran 1 Ahmed Ben Bella",
    "Mentouri University of Constantine",
  ],
  Tunisia: [
    "Tunis El Manar University",
    "University of Carthage",
    "University of Sfax",
    "University of Sousse",
  ],
};

function normalizeName(str: string): string {
  return str.trim().toLowerCase();
}

export function getUniversitiesForLocation(
  countryName: string,
  stateName?: string,
): string[] {
  if (!countryName) return [];

  const matchedCountry = Object.keys(UNIVERSITIES_DATA).find(
    (c) => normalizeName(c) === normalizeName(countryName),
  );

  if (matchedCountry) {
    const statesMap = UNIVERSITIES_DATA[matchedCountry];

    if (stateName && stateName.trim()) {
      const matchedState = Object.keys(statesMap).find(
        (s) =>
          normalizeName(s) === normalizeName(stateName) ||
          normalizeName(stateName).includes(normalizeName(s)) ||
          normalizeName(s).includes(normalizeName(stateName)),
      );

      if (matchedState && statesMap[matchedState]?.length) {
        return statesMap[matchedState];
      }
    }

    const allCountryUniversities = Object.values(statesMap).flat();
    if (allCountryUniversities.length > 0) {
      return Array.from(new Set(allCountryUniversities));
    }
  }

  const fallbackCountry = Object.keys(NATIONWIDE_FALLBACKS).find(
    (c) => normalizeName(c) === normalizeName(countryName),
  );
  if (fallbackCountry) {
    return NATIONWIDE_FALLBACKS[fallbackCountry];
  }

  return [];
}

export function searchUniversities(
  countryName: string,
  stateName: string | undefined,
  query: string,
): string[] {
  const baseList = getUniversitiesForLocation(countryName, stateName);
  const q = query.trim().toLowerCase();
  if (!q) return baseList;

  return baseList.filter((uni) => uni.toLowerCase().includes(q));
}

