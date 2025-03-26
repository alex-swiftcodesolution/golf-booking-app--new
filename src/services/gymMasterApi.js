import axios from "axios";

const gymMasterApi = axios.create({
  baseURL: "https://www.gymmaster.com/gymmaster-api/", // Replace with the actual Gym Master API base URL
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer YOUR_API_KEY`, // Replace with your Gym Master API key
  },
});

// Fetch list of clubs
export const getClubs = async () => {
  //   try {
  //     const response = await gymMasterApi.get("/portal/api/v1/companies"); // Replace with the actual endpoint
  //     return response.data;
  //   } catch (error) {
  //     console.error("Error fetching clubs:", error);
  //     throw error;
  //   }
  return [
    { id: "club1", name: "Club 1" },
    { id: "club2", name: "Club 2" },
    { id: "club3", name: "Club 3" },
  ];
};

export default gymMasterApi;
