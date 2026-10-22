"use client"

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthProvider";
import { useApiWithTokenRefresh } from "../hooks/useApiWithTokenRefresh";
import { usePathname } from "next/navigation";
import AccordionBox from "../components/accordionBox";
import Button from "../components/button";
import { LoadingSquareFullPage } from "../components/loadingSquare";
import { TENDER, FIELDS, Vi } from "../tenderStory";
import "../styles/spinKit.css";
import "../styles/spinner.css";

/**
 * Page containing read and write functionality of user data (on top) and the decryption component (below).
 * @returns {JSX.Element} - HTML structure of the /user landing page after login, parent of databaseExposureTable
 */
export default function User(){

    // Current path displayed
    const pathname = usePathname();

    // Auth context
    const auth = useAuth();
    const {baseURL, realm, authenticated, contextLoading, setBackgroundProcessing} = auth;
    const { callWithRefresh } = useApiWithTokenRefresh(auth);

    // Logged in user object
    const [loggedUser, setLoggedUser] = useState(null);
    
    // Data from ID Token
    const [tokenCC, setTokenCC] = useState();
    const [tokenDoB, setTokenDoB] = useState();
    
    // Encrypted user data in the database, modified to expand for full view or shortened.
    const [expandedBlobs, setExpandedBlobs] = useState({});
    // Confirmation message displayed to user after button click
    const [userFeedback, setUserFeedback] = useState("");
    // Expandable extra user information
    const [showUserInfoAccordion, setShowUserInfoAccordion] = useState(false);
    
    // Show the page only after all data loaded
    const [dataLoading, setDataLoading] = useState(true);
    // Show a loading screen while waiting for context with this variable
    const [overlayLoading, setOverlayLoading] = useState(false);
    // State variable for managing button and its spinner
    const [loadingButton, setLoadingButton] = useState(false);

    // Data values for user information component
    const [formData, setFormData] = useState({
        dob: "",
        cc: ""
    });

    // Encrypted Date of Birth from database to decrypted in databaseExposureTable
    const [encryptedDob, setEncryptedDob] = useState("");
    // Encrypted Credit Card from database to decrypted in databaseExposureTable
    const [encryptedCc, setEncryptedCc] = useState("");


    // Only show overlay when context is loading
    useEffect(() => {
      if (contextLoading){
        setOverlayLoading(true);
      }
    }, [])

    // Runs first, once context verifies user is authenticated populate all users' demo data
    useEffect(() => {
      if (!contextLoading && authenticated && baseURL && realm){
        getAllUsers();
      }
    }, [contextLoading, authenticated, baseURL, realm])

    // Runs second, perform only when the context receives the logged user details to decrypt
    useEffect(() => {
      if (loggedUser && !contextLoading){
        getUserData();
      }
    }, [loggedUser])

    // Update the value of the two user input fields when user interacts
    const handleUserFieldChange = (field) => (e) => {
      setFormData({ ...formData, [field]: e.target.value });
    };

    // Populate the Database Exposure cards, and set the current logged users
    const getAllUsers = async () => {
      // Guard: ensure required values are available
      if (!baseURL || !realm) {
        console.warn("getAllUsers: baseURL or realm not available yet");
        return;
      }

      setDataLoading(true);

      try {
        await callWithRefresh(async () => {
          // This is for the Accordion - it shows data directly from the database as is, not from id token.
          // Resolved server-side (master token): under the new IGA the browser
          // user holds no realm-management roles (MF2 guard), so it cannot
          // list users itself.
          const loggedVuid = auth.getValueFromToken("vuid");
          let loggedInUser = null;
          if (loggedVuid) {
            const response = await fetch(`/api/getUserByVuid?vuid=${encodeURIComponent(loggedVuid)}`);
            if (response.ok) {
              loggedInUser = (await response.json()).user;
            } else {
              console.error("getUserByVuid failed:", response.status);
            }
          }
          setLoggedUser(loggedInUser);

          // Use the encrypted DoB and CC from the identity token for this Users Page
          setTokenDoB(auth.getValueFromIdToken("dob"));
          setTokenCC(auth.getValueFromIdToken("cc"));
        }, "getAllUsers");
      } catch (error) {
        console.error("Error in getAllUsers:", error);
        setDataLoading(false);
        setOverlayLoading(false);
      }
    };

    // Decrypt the logged in user's data
    const getUserData = async () => { 
      // Let context data load first
      if (loggedUser){
          try {
            let arrayToDecrypt = [];

            // Date of Birth
            if (tokenDoB && auth.hasOneRole("_tide_dob.selfdecrypt")){
              arrayToDecrypt.push({
                "encrypted": tokenDoB,
                "tags": ["dob"]
              })
            }

            // Credit Card
            if (tokenCC && auth.hasOneRole("_tide_cc.selfdecrypt")){
               arrayToDecrypt.push({
                "encrypted": tokenCC,
                "tags": ["cc"]
              })
            }

            if (arrayToDecrypt.length === 0){
              throw new Error("No Read Permissions. Displaying only encrypted data.");
            }

            if (arrayToDecrypt.length > 0){
              const decryptedData = await auth.doDecrypt(arrayToDecrypt);
              
              if (arrayToDecrypt.length === 2){
                // User Information
                setFormData(prev => ({...prev, dob: decryptedData[0]}));
                setFormData(prev => ({...prev, cc: decryptedData[1]}));
                // For Accordion - use the data directly from the database
                setEncryptedDob(loggedUser.attributes.dob[0]); 
                setEncryptedCc(loggedUser.attributes.cc[0]); 
              }
              else if (arrayToDecrypt[0].tags[0] === "dob"){
                // User Information
                setFormData(prev => ({...prev, dob: decryptedData[0]}));
                setFormData(prev => ({...prev, cc: tokenCC}));
                // For the Accordion - use the data directly from the database
                setEncryptedDob(loggedUser.attributes.dob[0]); 
                setEncryptedCc(loggedUser.attributes.cc[0]); 
              }
              else { 
                // User Information
                setFormData(prev => ({...prev, dob: tokenDoB}));
                setFormData(prev => ({...prev, cc: decryptedData[0]}));
                // For Accordion - use the data directly from the database
                setEncryptedDob(loggedUser.attributes.dob[0]); 
                setEncryptedCc(loggedUser.attributes.cc[0]); 
              }
            }
            // Close the overlay
            setOverlayLoading(false);
            setDataLoading(false);

          } catch (error){
            setOverlayLoading(false);
            setDataLoading(false);
          }
      } 
    };
    
    // Converts saved encrypted blobs to shortened versions to display in accordions
    const shortenString = (string) => {
        const start = string.slice(0, 30);
        const end = string.slice(200);
        return `${start} ....... ${end}`;
    } 

    // On Save changes button clicked, encrypt the updated data and store in TideCloak
    const handleFormSubmit = async (e) => {
        // Don't perform regular browser operations for this form
        e.preventDefault();
        setLoadingButton(true);
        // Save takes a few seconds (encrypt + updateUser + token refreshes), so
        // show the full-page loader for the whole operation, not just a tiny
        // spinner next to the button.
        setOverlayLoading(true);

        try {
            let arrayToEncrypt = [];

            if (formData.dob !== "" && auth.hasOneRole("_tide_dob.selfencrypt")){ 
              if (loggedUser.attributes.dob){
                if (/[a-zA-Z]/.test(formData.dob)){
                  console.log("DoB can't have letters. Don't encrypt as it may already be encrypted.");
                }
                else {
                  arrayToEncrypt.push({
                    "data": formData.dob,
                    "tags": ["dob"]
                  })
                }
              }
            }

            if (formData.cc !== "" && auth.hasOneRole("_tide_cc.selfencrypt")){
              if (loggedUser.attributes.cc){
                if (/[a-zA-Z]/.test(formData.cc)){
                  console.log("CC can't have letters. Don't encrypt as it may already be encrypted.");
                }
                else {
                  arrayToEncrypt.push({
                    "data": formData.cc,
                    "tags": ["cc"]
                  })
                }
              }
            }

            if (arrayToEncrypt.length > 0){
              const encryptedData = await auth.doEncrypt(arrayToEncrypt);
              if (arrayToEncrypt.length === 2){
                setEncryptedDob(encryptedData[0]);
                setEncryptedCc(encryptedData[1]); 
                loggedUser.attributes.dob = encryptedData[0];
                loggedUser.attributes.cc = encryptedData[1];
              }
              else if (arrayToEncrypt[0].tags[0] === "dob"){
                setEncryptedDob(encryptedData[0]);
                setEncryptedCc(loggedUser.attributes.cc[0]);
                loggedUser.attributes.dob = encryptedData[0];
              }
              else {
                setEncryptedDob(loggedUser.attributes.dob[0]);
                setEncryptedCc(encryptedData[0]); 
                loggedUser.attributes.cc = encryptedData[0];
              }

            }

            // Store the data server-side (master token) - the browser user
            // holds no manage-users under the new IGA, and the captured
            // change request needs draining before the write is live.
            const response = await fetch(`/api/updateUser`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user: loggedUser }),
            });
            if (!response.ok) {
              console.error("updateUser failed:", await response.text());
            }

            // Force immediate token refresh to get updated ID token with new encrypted values
            console.log("User data updated. Force refreshing token...");
            setBackgroundProcessing(true);

            // Wait for backend to propagate changes
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Force refresh immediately (not just when expired)
            await auth.forceUpdateToken();
            console.log("First force refresh complete. Waiting for backend propagation...");

            // Wait for backend to propagate
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Second force refresh
            await auth.forceUpdateToken();
            console.log("Second force refresh complete. Waiting...");

            // Wait again
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Third force refresh to ensure we have the latest token
            await auth.forceUpdateToken();
            console.log("Token force refresh complete with updated user data");

            // Show the confirmation message
            if (response.ok){
                setUserFeedback("Sealed! Encrypted in your browser before it left.");
                setTimeout(() => setUserFeedback(""), 3000); // Clear after 3 seconds
                getAllUsers();
            }
        }
        catch (error) {
          console.log(error);
        }
        finally {
          // Always clear the busy flags. Otherwise a failed save leaves the nav
          // buttons permanently disabled (backgroundProcessing) and the page
          // stuck on the loader (overlayLoading).
          setBackgroundProcessing(false);
          setOverlayLoading(false);
          setLoadingButton(false);
        }
    };

    return (
  (contextLoading || overlayLoading || dataLoading)
    ? (
      <LoadingSquareFullPage />
    )
    : (
      <main className="flex-grow w-full pt-6 pb-16">
        <div className="w-full px-8 max-w-screen-md mx-auto flex flex-col items-start gap-8">
          <div className="w-full max-w-3xl">
            {pathname === "/user" && (
              <div key="user" className="space-y-4 relative">
                {/* Accordion toggle */}
                <button
                  onClick={() => setShowUserInfoAccordion(prev => !prev)}
                  className="absolute -top-2 right-0 text-2xl hover:scale-110 transition-transform"
                  aria-label="Toggle explanation"
                >
                  {showUserInfoAccordion ? "🤯" : "🤔"}
                </button>

                {/* Accordion content */}
                <AccordionBox title="Why no one can peek at your bid" isOpen={showUserInfoAccordion}>
  <ul className="list-disc pl-5 space-y-1 mt-2">
    <li>
      <strong>No insider preview.</strong> The procurement head, DBA, platform operator and any AI agent see only ciphertext in the database.
    </li>
    <li>
      <strong>Decryption at the edge.</strong> Only the role holder can decrypt in their browser session; the Fabric never sees the bid plaintext.
    </li>
    <li>
      <strong>Committee quorum.</strong> Changing envelope access needs 3 of 5 committee signatures, including opening the financial envelopes.
    </li>
    <li>
      <strong>Signed and auditable.</strong> Every change to the tender rules is signed and recorded in a tamper-evident audit trail.
    </li>
  </ul>

</AccordionBox>



                <h2 className="text-3xl font-bold mb-4">My Sealed Bid<Vi>Hồ sơ dự thầu niêm phong của tôi</Vi></h2>
                <p className="text-sm text-gray-600">{TENDER.id} · {TENDER.title} · {TENDER.buyer}</p>
                {(
                  !auth.hasOneRole("_tide_dob.selfdecrypt") &&
                  !auth.hasOneRole("_tide_dob.selfencrypt") &&
                  !auth.hasOneRole("_tide_cc.selfdecrypt") &&
                  !auth.hasOneRole("_tide_cc.selfencrypt")
                ) ? (
                  <p className="text-sm text-gray-600 mb-6">
                    Vendor A currently has no envelope access. The Fabric cannot reveal or accept your bid until the Tender Committee passes a motion granting the required roles.
                  </p>
                ) : (
                  <p className="text-sm text-gray-600 mb-6">You are Vendor A. Submit delivery time in the technical envelope and your price in the financial envelope. Initially, you can read and edit delivery time, but price is write-only: once sealed, nobody can decrypt it, including your own session, until 3 of 5 committee members sign a motion to open the financial envelopes.</p>
                )}

                <form className="space-y-6" onSubmit={handleFormSubmit}>
                  {["dob", "cc"].map((field, i) => {
                    const readPerms = auth.hasOneRole(field === "dob" ? "_tide_dob.selfdecrypt" : "_tide_cc.selfdecrypt");
                    const writePerms = auth.hasOneRole(field === "dob" ? "_tide_dob.selfencrypt" : "_tide_cc.selfencrypt");
                    const canRead = !!readPerms;
                    const canWrite = !!writePerms;
                    const label = FIELDS[field].en;

                    // If user has neither read nor write permissions, only show the “encrypted” accordion block
                    if (!canRead && !canWrite) {
                      return (
                        <div key={i}>
                          <p className="font-medium text-sm">{label}<Vi>{FIELDS[field].vi}</Vi></p>
                          <span className="inline-block mt-2 rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">Sealed - no access in this session</span>
                          {showUserInfoAccordion && (
                            <div className="text-xs text-gray-600 mt-2 space-y-2 bg-gray-50 border border-gray-200 rounded p-3">
                              <h5 className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-1">
                                JWT Permissions &amp; Encrypted Value
                              </h5>
                              <div className="flex gap-2">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                    canRead ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {canRead ? "✓" : "✕"} Read
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                    canWrite ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {canWrite ? "✓" : "✕"} Write
                                </span>
                              </div>
                              <div className="break-words whitespace-pre-wrap text-sm">
                                <span className="font-medium text-gray-700">Value in Database:</span>{" "}
                                <span
                                  onClick={() =>
                                    setExpandedBlobs(prev => ({ ...prev, [field]: !prev[field] }))
                                  }
                                  className="text-blue-600 underline cursor-pointer break-words"
                                >
                                  {field === "dob"
                                    ? (expandedBlobs[field] ? encryptedDob : shortenString(encryptedDob))
                                    : (expandedBlobs[field] ? encryptedCc : shortenString(encryptedCc))}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Otherwise, render a normal input (read/write, read-only, or write-only)
                    return (
                      <div key={field}>
                        <label className="block font-medium text-sm mb-1">{label}<Vi>{FIELDS[field].vi}</Vi></label>
                        <span className="block w-fit mb-2 rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                          {canWrite && !canRead
                            ? "🔒 Sealed on submit - not even you can reopen it until the committee opens the envelopes"
                            : canRead && !canWrite
                              ? "Submissions closed - read-only"
                              : "Open for editing"}
                        </span>
                        {canRead && canWrite && (
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder={FIELDS[field].placeholder}
                            value={formData[field]}
                            onChange={handleUserFieldChange(field)}
                            className="border rounded px-3 py-2 w-full max-w-md"
                          />
                        )}

                        {canRead && !canWrite && (
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder={FIELDS[field].placeholder}
                            value={formData[field] || ""}
                            readOnly
                            className="border rounded px-3 py-2 w-full bg-gray-100 text-gray-700 max-w-md"
                          />
                        )}

                        {!canRead && canWrite && (
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder={FIELDS[field].placeholder}
                            value={formData[field]}
                            onChange={handleUserFieldChange(field)}
                            className="border rounded px-3 py-2 w-full max-w-md"
                          />
                        )}

                        {showUserInfoAccordion && (
                          <div className="text-xs text-gray-600 mt-2 space-y-2 bg-gray-50 border border-gray-200 rounded p-3">
                            <h5 className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-1">
                              JWT Permissions &amp; Encrypted Value
                            </h5>
                            <div className="flex gap-2">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                  canRead ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                }`}
                              >
                                {canRead ? "✓" : "✕"} Read
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                  canWrite ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                }`}
                              >
                                {canWrite ? "✓" : "✕"} Write
                              </span>
                            </div>
                            <div className="break-words whitespace-pre-wrap text-sm">
                              <span className="font-medium text-gray-700">Value in Database:</span>{" "}
                              <span
                                onClick={() =>
                                  setExpandedBlobs(prev => ({ ...prev, [field]: !prev[field] }))
                                }
                                className="text-blue-600 underline cursor-pointer break-words"
                              >
                                {field === "dob"
                                  ? (expandedBlobs[field] ? encryptedDob : shortenString(encryptedDob))
                                  : (expandedBlobs[field] ? encryptedCc : shortenString(encryptedCc))}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {(auth.hasOneRole("_tide_dob.selfencrypt") || auth.hasOneRole("_tide_cc.selfencrypt")) && (
                    <div className="flex items-center gap-3">
                      <Button className="hover:bg-red-700" type="submit" disabled={loadingButton}>
                        Seal &amp; Submit
                        <span className="block text-xs italic text-red-100">Niêm phong &amp; nộp</span>
                      </Button>
                      {loadingButton && <div className="spinner" />}
                      {userFeedback && (
                        <span className="text-sm text-green-600 font-medium">
                          {userFeedback}
                        </span>
                      )}
                    </div>
                  )}
                </form>
              </div>
            )}
          </div>
        </div>
        <div className="h-10" />
      </main>
    )
  )
}
