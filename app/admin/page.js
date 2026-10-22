"use client"
import { useState, useEffect, useRef } from "react";
import appService from "../../lib/appService";
import { useAuth } from "../context/AuthProvider";
import { useApiWithTokenRefresh } from "../hooks/useApiWithTokenRefresh";
import AccordionBox from "../components/accordionBox";
import Button from "../components/button";
import { FaCheckCircle, FaChevronRight } from "react-icons/fa";
import { usePathname, useRouter } from "next/navigation";
import { LoadingSquareFullPage } from "../components/loadingSquare";
import { FIELDS, COMMITTEE } from "../tenderStory";
import "../styles/spinKit.css";
import "../styles/spinner.css";

/**
 * Card shown once a change request is committed. The middleware guards /user and
 * bounces unauthorized navigations back to "/", and immediately after a commit
 * the freshly-refreshed token/cookie isn't always in place yet — which is why a
 * first click used to land on the homepage and only the second worked. So probe
 * /user until the middleware actually lets it through, showing a loader until
 * then and only then revealing the "View on User Page" link.
 * @param {Object} props
 * @param {ReturnType<import("next/navigation").useRouter>} props.router - app router for navigation
 * @returns {JSX.Element}
 */
function DoneCard({ router }) {
  const [ready, setReady] = useState(false);
  const pv = useAuth().preview;

  useEffect(() => {
    if (pv) { setReady(true); return; }
    let cancelled = false;
    let attempts = 0;

    const probe = async () => {
      try {
        // A real navigation hits the middleware; redirect:"manual" surfaces its
        // redirect-to-"/" as a non-ok opaqueredirect without following it. A 200
        // means the middleware will let an actual navigation through.
        const res = await fetch("/user", { redirect: "manual", cache: "no-store" });
        if (!cancelled && res.ok) {
          setReady(true);
          return;
        }
      } catch {
        // network/transient error — fall through and retry
      }
      if (!cancelled && attempts++ < 20) {
        setTimeout(probe, 500);
      }
    };

    probe();
    return () => { cancelled = true; };
  }, []);

  if (!ready) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow flex items-center gap-3 mt-8">
        <div className="spinner--left" />
        <span className="text-sm text-slate-600">Committing the committee motion…</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow space-y-4 mt-8">
      <div className="mt-4">
        <div className="text-sm text-slate-600 flex items-center gap-2">
          <FaCheckCircle className="text-green-500" />
          <span>Motion committed by quorum.</span>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              router.push(pv ? "/tender" : "/user");
            }}
            className="text-blue-600 hover:underline font-medium whitespace-nowrap"
          >
            {pv ? "Back to Tender Board →" : "View My Sealed Bid →"}
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Admin page for elavating the demo user to a Tide admin and managing their read and write permissions for Date of Birth and Credit Card
 * @returns {JSX.Element} - HTML for the /admin path containing the permissions management via change requests
 */
export default function Admin() {
  // Current path
  const pathname = usePathname();
  // Navigator
  const router = useRouter();
  // Shared context data
  const auth = useAuth();
  const { baseURL, realm, authenticated, contextLoading, getToken, hasRealmRole, hasClientRole, approveTideRequests, setBackgroundProcessing } = auth;
  const { callWithRefresh } = useApiWithTokenRefresh(auth);
  // Admin state of the logged in demo user
  const [isTideAdmin, setIsTideAdmin] = useState(false);
  // Object representation of the logged in user
  const [loggedUser, setLoggedUser] = useState(null);

  // Extra information
  const [showAdminAccordion, setShowAdminAccordion] = useState(false);
  const [showChangeInfo, setShowChangeInfo] = useState(false);
  
  // Current change request being managed
  const [activeRequestIndex, setActiveRequestIndex] = useState(0);
  // Current change request being opened
  const [expandedIndex, setExpandedIndex] = useState(0);

  // Show page only if loaded
  const [loading, setLoading] = useState(true);
  // Loading overlay for the context
  const [loadingOverlay, setLoadingOverlay] = useState(false);
  // Spinning loader and button manager
  const [loadingButton, setLoadingButton] = useState(false);

  // True when boxes don't match the token's roles
  const [hasChanges, setHasChanges] = useState(false);
  // All user change requests
  const [requests, setRequests] = useState([]);
  
  // Extra information on what elevating a user to Tide Admin does
  const [showExplainer, setShowExplainer] = useState(false);
  
  // This button only appears when logged in demo user doesn't have the  Tide Admin role yet
  const handleElevateClick = () => setShowExplainer(true);

  // Check Boxes
  const [hasDobReadPerm, setHasDobReadPerm] = useState(false);
  const [hasDobWritePerm, setHasDobWritePerm] = useState(false);
  const [hasCcReadPerm, setHasCcReadPerm] = useState(false);
  const [hasCcWritePerm, setHasCcWritePerm] = useState(false);

  // User's input state to the change request
  const [hasUserApproved, setHasUserApproved] = useState(false);
  // State of active change request based on quorum
  const [isApproved, setIsApproved] = useState(false);
  // How many admins approved
  const [totalApproved, setTotalApproved] = useState(1);
  // Demo data to simulate admins approving the active change request
  const ADMIN_NAMES = ["You", "Alice", "Ben", "Carlos", "Dana"];
  // Current hasUserApproved state for each admin    
  const [approvals, setApprovals] = useState([false, false, false, false, false]);
  // Once approved, change requests becomes pending as it waits for other admins to approve to a total threshold (3 for this demo)
  const [pending, setPending] = useState(false);

  // State of whether the first QuorumDashBoard (card) has ran. Used to prevent too many animations, only 3 is needed.
  const quorumDashRef  = useRef(false);

  const [dobWriteRole, setDobWriteRole] = useState();
  const [dobReadRole, setDobReadRole] = useState();
  const [ccWriteRole, setCcWriteRole] = useState();
  const [ccReadRole, setCcReadRole] = useState();

  // Wait for context to load first when refreshing browser or similar destruction of context
  useEffect(() => {
    if (!contextLoading){
      getRealmRoles();
    }
  }, [contextLoading])

  // For demo purposes, fetched stored or store data of admins who have approved locally
  useEffect(() => {
    const storedApprovals = localStorage.getItem("approvals");
    // This is intended only for when refreshing browser, approvals[0] would be false then
    if (isApproved && approvals[0] === false){
      if (storedApprovals){
        setApprovals(JSON.parse(storedApprovals));
      }
      else {
        // Make up a new array of people who approved
        let approvals = [true, false, false, false, false]
        const others = [1, 2, 3, 4];
        const shuffled = others.sort(() => 0.5 - Math.random()).slice(0, 2);
        shuffled.forEach((index) => {
          approvals[index] = true;
        })
        
        setApprovals(approvals);
      }
    }
  }, [isApproved])

  // Run first
  useEffect(() => {
    if (authenticated){
      getLoggedUser();
    }
  }, [authenticated])

  // Then get the currently assigned realm roles of the logged in user after they've been identified 
  useEffect(() => {
    if (loggedUser){ 
      checkAdminRole();  
    }
  }, [loggedUser])

  // Then check if they're a Tide Admin to decide which components to render 
  useEffect(() => {
      // Shouldn't need to get permissions if logged in user isn't an Admin; will need to elevate instead
      if (isTideAdmin){
        setUserPermissions();
        if (isTideAdmin){
          getChangeRequests(); // Get existing requests to cancel them
        }
      }
  }, [isTideAdmin])

  // Get current logged in user. Resolved server-side (master token): under
  // the new IGA browser users hold no view-users before becoming admin.
  const getLoggedUser = async () => {
    const loggedVuid = auth.getValueFromToken("vuid");
    if (!loggedVuid) {
      return;
    }
    const response = await fetch(`/api/getUserByVuid?vuid=${encodeURIComponent(loggedVuid)}`);
    if (!response.ok) {
      console.error("getUserByVuid failed:", response.status);
      return;
    }
    setLoggedUser((await response.json()).user);
  };
  
  // Get the current user realm roles to prefill the boxes and for updating the permissions
  const setUserPermissions = async () => { 
    if (loggedUser){
      setHasDobReadPerm(auth.hasOneRole("_tide_dob.selfdecrypt"));
      setHasDobWritePerm(auth.hasOneRole("_tide_dob.selfencrypt"));

      setHasCcReadPerm(auth.hasOneRole("_tide_cc.selfdecrypt"));
      setHasCcWritePerm(auth.hasOneRole("_tide_cc.selfencrypt"));
    }
  };

  // On initial render check if logged user is admin to decide which components
  // to show. Checked server-side (master token): this runs before the visitor
  // becomes an admin, and under the new IGA ordinary users hold no
  // view-users/view-clients.
  const checkAdminRole = async () => {
      const loggedVuid = auth.getValueFromToken("vuid");
      const response = await fetch(`/api/checkAdminRole?vuid=${encodeURIComponent(loggedVuid)}`);
      if (response.ok) {
        setIsTideAdmin((await response.json()).isAdmin);
      } else {
        console.error("checkAdminRole failed:", response.status);
      }
      setLoading(false);
  }

  // Assign this initial user the tide-realm-admin client role managed by the default client Realm Management
  const confirmAdmin = async () => {
    setLoadingButton(true);

    try {
        if (!isTideAdmin){
            // The full elevation — resolve the realm-management client, assign the
            // tide-realm-admin role, then sign + commit the change request — runs
            // server-side with the master token. A not-yet-admin user can't perform
            // these admin operations with their own token.
            const response = await fetch(`/api/commitAdminRole`);

            if (response.ok) {
                // Force immediate token refresh to get updated token with admin role
                console.log("Admin role committed. Force refreshing token...");
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

                setIsTideAdmin(true);
                console.log("Admin Role Assigned and token refreshed");
            } else {
                console.error("[confirmAdmin] Failed to elevate user to admin:", await response.text());
            }
        }
        else {
            setIsTideAdmin(true);
        }
    }
    catch (error) {
        console.error("[confirmAdmin] error:", error);
    }
    finally {
        // Always clear the busy flags so a failure doesn't leave the nav
        // buttons permanently disabled (backgroundProcessing).
        setBackgroundProcessing(false);
        setLoadingButton(false);
    }
  };

  // Get latest change requests to display and update when pressing commit
  const getChangeRequests = async () => {
    // Guard: ensure required values are available
    if (!baseURL || !realm) {
      console.warn("getChangeRequests: baseURL or realm not available yet");
      return;
    }

    await callWithRefresh(async () => {
      const token = await auth.getToken();
      const changeRequests = await appService.getUserRequests(baseURL, realm, token);

      // Safety check: ensure changeRequests is an array
      if (!Array.isArray(changeRequests)) {
        console.error("getUserRequests did not return an array:", changeRequests);
        setRequests([]);
        return;
      }

      // Remove Denied Requests
      const withoutDeniedReqs = changeRequests.filter((request) =>
        (request.deleteStatus !== "DENIED" && request.status !== "DENIED")
      )
      setRequests(withoutDeniedReqs);
    }, "getChangeRequests");
  }

  // Fetch all realm role objects to assign to user based on check box states.
  // Fetched server-side (master token): this runs before the visitor becomes
  // an admin, and under the new IGA ordinary users hold no view-realm.
  const getRealmRoles = async () => {
    const names = ["_tide_dob.selfencrypt", "_tide_dob.selfdecrypt", "_tide_cc.selfdecrypt", "_tide_cc.selfencrypt"];
    const response = await fetch(`/api/getRealmRoles?names=${encodeURIComponent(names.join(","))}`);
    if (!response.ok) {
      console.error("getRealmRoles failed:", response.status);
      return;
    }
    const { roles } = await response.json();
    setDobWriteRole(roles["_tide_dob.selfencrypt"]);
    setDobReadRole(roles["_tide_dob.selfdecrypt"]);
    setCcReadRole(roles["_tide_cc.selfdecrypt"]);
    setCcWriteRole(roles["_tide_cc.selfencrypt"]);
  }

  /**
   * Assign or unassign the logged in user realm roles (pemissions)
   * @param {*} e - the form's event, when Submit Changes button is clicked
   */
  const handleAdminPermissionSubmit = async (e) => {
    e.preventDefault();
    // Show the full-page loader for the whole submit (cancel old requests +
    // assign/unassign roles + refetch all take a few seconds). It was only ever
    // turned off, never on, so no indicator showed.
    setLoadingOverlay(true);

    try {
      const token = await auth.getToken();

      // Clear cached data of the demo admins who have approved for a reset
      localStorage.removeItem("approvals");

      // Get all then cancel all requests before assigning new ones
      const allRequests = await appService.getUserRequests(baseURL, realm, token); // Including the denied requests
      await cancelRequests(allRequests);

      // Compare the current checkbox state with the current permissions. Note: token roles only update when a role change request commits.
      // If the states don't match, a change request is required and made.
      const checkBoxPerms = [hasDobReadPerm, hasDobWritePerm, hasCcReadPerm, hasCcWritePerm];
      const roles = ["_tide_dob.selfdecrypt", "_tide_dob.selfencrypt", "_tide_cc.selfdecrypt", "_tide_cc.selfencrypt"];
      const rolesInfo = [dobReadRole, dobWriteRole, ccReadRole, ccWriteRole];

      for (let i = 0; i < checkBoxPerms.length; i++){
        if (checkBoxPerms[i] && !auth.hasOneRole(roles[i])){
          await appService.assignRealmRole(baseURL, realm, loggedUser.id, rolesInfo[i], token);
        }
        else if (!checkBoxPerms[i] && auth.hasOneRole(roles[i])){
          await appService.unassignRealmRole(baseURL, realm, loggedUser.id, rolesInfo[i], token);
        }
      }

      // Get the latest change requests
      const newRequests = await appService.getUserRequests(baseURL, realm, token);
      setRequests(newRequests);

      // Set first change request as the one currently opened
      setActiveRequestIndex(0);
      setExpandedIndex(0);
      // Reset form state
      setHasChanges(false);
    }
    catch (error) {
      console.error("[handleAdminPermissionSubmit] error:", error);
    }
    finally {
      setLoadingOverlay(false);
    }
  }

  /**
   * Each is a card the represents the change request, its status, action, admins approved and user's action button
   * @param {Object} request - representation of the change request
   * @param {Function} onCommit - when the commit button is clicked run addCommit() for that change request
   * @returns {JSX.Element} - HTML of the card representation 
   */
  function QuorumDashboard({ request, onCommit }) {
      // Current request's status to be displayed
      let requestStatus;

      // The status can be represented by either deleteStatus or status fields of the change request object
      if (request.deleteStatus){
        requestStatus = request.deleteStatus;
      }
      else { 
        requestStatus = request.status;
      }
    
      // When committed — show a loader until the middleware will actually let us
      // navigate to /user, then reveal the link (see DoneCard).
      if (requestStatus === "COMMITTED" && requests.length === activeRequestIndex + 1 ) {
        return <DoneCard router={router} />;
      }
      
      // Perform approval checks and commit checks everytime requests is updated from the enclave actions
      useEffect(() => {
        // Based on the status of the change request, trigger useEffect to update the current approvals on refresh
        if (requestStatus === "APPROVED"){
          setIsApproved(true);
        }

        // When Approving (Animation)
        if (hasUserApproved && quorumDashRef.current === false){
          quorumDashRef.current = true;
          
          const others = [1, 2, 3, 4];
          const shuffled = others.sort(() => 0.5 - Math.random()).slice(0, 2);
          let completed = 0;

          // Temporary array to update currently approved users for a change request and store locally
          const updated = [...approvals];
          shuffled.forEach((index, i) => {
            setTimeout(async() => {
              updated[index] = true;
              setApprovals([...updated]);

              // Update the UI's counter for number of people approved
              setTotalApproved(prev => prev + 1);
            
              // To break out of animation loop after the last animation and change status from PENDING
              completed++;
              if (completed === shuffled.length){
                setPending(false);
                setHasUserApproved(false);
                // Change the button to a Commit button based on the new status
                requestStatus = requests[activeRequestIndex].deleteStatus ? requests[activeRequestIndex].deleteStatus : requests[activeRequestIndex].status;
                // Allow next change request card to be used
                quorumDashRef.current = false;
                // Store locally for persistence through browser refresh
                localStorage.setItem("approvals", JSON.stringify(updated));
                  
              }
            }, (i + 1) * 900);
          });  
        }
      }, [hasUserApproved])
    
      // POST /iga/change-requests/{id}/deny
      // Add denied status to change request
      const addRejection = async (action, draftId, type) => {
        const token = await auth.getToken();

        const response = await appService.denyEnclave(baseURL, realm, draftId, token);
        if (response.ok){
          setRequests(await appService.getUserRequests(baseURL, realm, token));
          setHasUserApproved(false);
          setActiveRequestIndex(prev => prev + 1);
          setExpandedIndex(prev => prev + 1);
        } 
      };
  
      // POST /iga/change-requests/{id}/approve (phase 2 - the signed doken)
      // Add approve status to change request
      const addApproval = async (action, draftId, type, approvedRequest) => {
        const token = await auth.getToken();

        // Convert Uint8Array to base64
        const bytesToBase64 = (bytes) => {
          const binaryString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
          return btoa(binaryString);
        };

        const response = await appService.approveEnclave(baseURL, realm, draftId, bytesToBase64(approvedRequest), token);

        if (response.ok){
          // The native /approve auto-commits at quorum, so the request may no
          // longer be PENDING - keep the local card and lift its status.
          const updatedChangeReqs = await appService.getUserRequests(baseURL, realm, token);
          const updatedChangeReq = updatedChangeReqs.find(req => req.draftRecordId === draftId);
          requests[activeRequestIndex] = updatedChangeReq
            ?? { ...requests[activeRequestIndex], status: "APPROVED" };

          if (auth.preview) {
            setRequests([...updatedChangeReqs.filter((r) => r.deleteStatus !== "DENIED" && r.status !== "DENIED")]);
            return;
          }
          setApprovals([true, false, false, false, false]);
          setPending(true);
          setHasUserApproved(true);
        }

      };

        
      // When user presses Review button to show the Tide Enclave popup
      const handleUserApprove = async (changeRequest) => {
        try {
          const token = await auth.getToken();

          // Phase 1 of the native /approve ceremony - returns the enclave
          // carrier bytes, or null when the server recorded (and committed)
          // inline without needing the enclave (firstAdmin/Tideless lane).
          const changeSetBytes = await appService.reviewChangeRequest(baseURL, realm, changeRequest, token);

          if (!changeSetBytes) {
            console.log("Approval recorded inline (no enclave step needed).");
            requests[activeRequestIndex] = { ...requests[activeRequestIndex], status: "APPROVED" };
            setApprovals([true, false, false, false, false]);
            setPending(true);
            setHasUserApproved(true);
            return;
          }

          // Request approval from Tide operator
          const approvalResult = (await auth.approveTideRequests([{
            id: changeRequest.draftRecordId,
            request: changeSetBytes
          }]))[0]; // Only 1 request at a time for now

          // Handle approval result
          if (approvalResult.denied) {
            addRejection(changeRequest.actionType, changeRequest.draftRecordId, changeRequest.changeSetType);
          } else if (approvalResult.approved) {
            // The approved request contains the signed request bytes
            addApproval(changeRequest.actionType, changeRequest.draftRecordId, changeRequest.changeSetType, approvalResult.approved.request);
          }
          // If pending, do nothing (user closed the popup without deciding)
        } catch (error) {
          console.error("Error in handleUserApprove:", error);
        }
      };

      // Preview only: real per-persona signatures from the shared simulated state
      const pvSigners = auth.preview ? auth.preview.signersFor(request.draftRecordId) : null;
      const pvLights = pvSigners ? auth.preview.committee.map((c) => pvSigners.includes(c.id)) : null;
      const pvSigned = pvSigners ? pvSigners.includes(auth.preview.persona) : false;
      const lights = pvLights || approvals;
      const signedCount = pvSigners ? pvSigners.length : totalApproved;

      return (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow space-y-4 mt-8">

        <div className="flex justify-between items-center mt-6">
          {ADMIN_NAMES.map((name, idx) => (
            <div key={idx} className="relative flex flex-col items-center">
              <div
                className={`w-14 h-14 flex items-center justify-center rounded-full border-4 transition-all duration-700 ease-in-out 
          ${lights[idx] ? "border-green-500 shadow-md shadow-green-200" : "border-slate-200"}
        `}
              >
                <span className="font-semibold text-lg text-slate-600">{name[0]}</span>
              </div>
              <span className="text-xs mt-2 text-slate-600 text-center">{name} · {COMMITTEE[idx].role}</span>

              {/* Tick overlay – doesn't shift layout */}
              {lights[idx] && (
                <FaCheckCircle className="absolute top-0 right-0 text-green-500 w-4 h-4 transition-opacity duration-500 translate-x-2 -translate-y-2" />
              )}
            </div>
          ))}

        </div>

        <div className="pt-4">
          {pvSigners && (
            <p className="text-xs text-slate-500 mb-2">
              Signed by: {pvSigners.length ? auth.preview.committee.filter((c) => pvSigners.includes(c.id)).map((c) => c.label).join(", ") : "nobody yet"}
            </p>
          )}
          { pvSigners ? (
            pvSigners.length >= 3 ? (
              <div className="flex items-center gap-x-2">
                <Button className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700" onClick={onCommit} disabled={loadingButton}>
                  Commit
                </Button>
                {loadingButton ? <div className="spinner--left"/> : null}
              </div>
            ) : !pvSigned ? (
              <Button className="rounded-full" onClick={() => {handleUserApprove(request)}}>
                Review
              </Button>
            ) : (
              <p className="text-sm text-slate-500 italic">
                You signed. Awaiting quorum: <strong>{signedCount} / 3</strong> signatures. Switch to another committee member to sign.
              </p>
            )
          ) : request.deleteStatus === "DRAFT" || request.status === "DRAFT"? (
            <Button className="rounded-full" onClick={() => {handleUserApprove(request)}} disabled={pending}>
              Review
            </Button>

          ) : !pending && (request.deleteStatus === "APPROVED" || request.status === "APPROVED") ? (
            <div className="flex items-center gap-x-2">
              <Button className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700" onClick={onCommit} disabled={loadingButton}>
                Commit
              </Button>
              {
                loadingButton 
                ? <div className="spinner--left"/>
                : null
              }
            </div>
            
          ) : (
            <p className="text-sm text-slate-500 italic">
              Awaiting quorum: <strong>{totalApproved} / 3</strong> signatures
            </p>
          )}
        </div>

      </div >
    );
  }

  const addCommit = async (request) => {
      setLoadingButton(true);
      
      try{

        const token = await auth.getToken();

        const response = await appService.commitChange(baseURL, realm, request.draftRecordId, token);
        
        if (response.ok){
          // Hard code the change, because keycloak removes committed change requests
          if (requests[activeRequestIndex].deleteStatus){
            requests[activeRequestIndex].deleteStatus = "COMMITTED";
          }
          else {
            requests[activeRequestIndex].status = "COMMITTED";
          }

          // Clear the locally stored approved users array
          localStorage.removeItem("approvals");

          // Force immediate token refresh to get updated roles
          console.log("Change committed. Force refreshing token...");
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
          console.log("Token force refresh complete with updated roles");

          // Reset states for next change request
          setApprovals([false, false, false, false, false]);
          setTotalApproved(1);
          if (requests.length !== activeRequestIndex + 1 ){
            setActiveRequestIndex(prev => prev + 1);
            setExpandedIndex(prev => prev + 1);
          }
        }
      }catch(e){
        console.error("[addCommit] error:", e);
      }finally{
        // Always clear the busy flags, otherwise a failed commit (e.g. a token
        // refresh throwing) leaves the nav buttons permanently disabled
        // (backgroundProcessing) — which blocks going to /user after committing.
        setBackgroundProcessing(false);
        setLoadingButton(false);
      }
    };

    // If submit button is pressed again, cancel all the change requests
    const cancelRequests = async (requests) => {
      const token = await auth.getToken();

      for (let i = 0; i < requests.length; i++) {
        const response = await appService.cancelChange(baseURL, realm, requests[i].draftRecordId, token);
      }
    };

    // Presentation-only summary of the draft compared with committed token roles.
    const motionPreview = [];
    if (isTideAdmin) {
      const envelopes = [
        { name: "technical", read: hasDobReadPerm, write: hasDobWritePerm,
          currentRead: auth.hasOneRole("_tide_dob.selfdecrypt"), currentWrite: auth.hasOneRole("_tide_dob.selfencrypt") },
        { name: "financial", read: hasCcReadPerm, write: hasCcWritePerm,
          currentRead: auth.hasOneRole("_tide_cc.selfdecrypt"), currentWrite: auth.hasOneRole("_tide_cc.selfencrypt") },
      ];
      const closing = envelopes.filter(envelope => envelope.currentWrite && !envelope.write);
      const extending = envelopes.filter(envelope => !envelope.currentWrite && envelope.write);
      if (closing.length) {
        motionPreview.push(closing.length === 2 ? "Close submissions" : `Close ${closing[0].name} submissions`);
      }
      if (extending.length) {
        motionPreview.push(extending.length === 2 ? "Extend deadline for Vendor A" : `Extend ${extending[0].name} deadline for Vendor A`);
      }
      envelopes.forEach(envelope => {
        if (envelope.read !== envelope.currentRead) {
          motionPreview.push(envelope.read ? `Open ${envelope.name} envelopes` : `Remove access to ${envelope.name} envelopes`);
        }
      });
    }

    return (
      !loading
      ?
      <main className="flex-grow w-full pt-6">
      <div className="w-full px-8 max-w-screen-md mx-auto flex flex-col items-start gap-8">
      <div className="w-full max-w-3xl">
        {pathname === "/admin" && (
            <div key="admin" className="space-y-6 relative">

              {/* Accordion Icon */}
              <button
                onClick={() => setShowAdminAccordion(prev => !prev)}
                className="rounded-full absolute -top-2 right-0 text-2xl hover:scale-110 transition-transform"
                aria-label="Toggle explanation"
              >
                {showAdminAccordion ? "🤯" : "🤔"}
              </button>

              {/* Accordion Content */}
              <AccordionBox
  title="Why changes need committee signatures"
  isOpen={showAdminAccordion}
>
  <ul className="list-disc pl-5 space-y-1">
    <li>Each committee member authenticates independently.</li>
    <li>No insider controls the signing key.</li>
    <li>Unsigned edits grant no access.</li>
    <li>Changes need 3 of 5 signatures.</li>
    <li>API calls cannot bypass quorum.</li>
  </ul>
</AccordionBox>




              {!isTideAdmin && (
                <div className="space-y-4">
                  <h2 className="text-3xl font-bold mb-4">Tender Committee</h2>
                  <span className="inline-block rounded-full bg-indigo-50 text-indigo-700 text-xs px-2.5 py-0.5">Buyer · Lotus Industries</span>
                  <p className="text-sm text-slate-600 mb-6">Rule changes need 3 of 5 committee signatures.</p>
                  {!showExplainer ? (
                    <Button className="rounded-full bg-indigo-600 text-white hover:bg-indigo-700" onClick={handleElevateClick}>Join the committee (demo)</Button>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-2xl space-y-3">
                      <p className="font-semibold text-yellow-800">Demo committee access</p>
                      <p className="text-sm text-yellow-900">
                        You sign first; other signatures simulate.
                      </p>
                      <div className="flex items-center gap-x-4">
                        <Button className="rounded-full bg-indigo-600 text-white hover:bg-indigo-700" onClick={confirmAdmin} disabled={loadingButton}>Continue as committee member #1</Button>
                        {
                          loadingButton
                          ? <div className="spinner--left"/>
                          : null
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isTideAdmin && (
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold mb-4">Tender Committee</h2>
                  <span className="inline-block rounded-full bg-indigo-50 text-indigo-700 text-xs px-2.5 py-0.5">Buyer · Lotus Industries</span>
                  <p className="text-sm text-slate-600">
                    Rule changes need 3 of 5 committee signatures.
                  </p>
                  <form
                    onSubmit={handleAdminPermissionSubmit}
                    onChange={() => setHasChanges(true)}
                    className="space-y-6"
                  >
                    <div className="border rounded-2xl p-5 bg-white space-y-6">
                      <h4 className="text-base font-semibold text-slate-900">Motion: Vendor A's envelopes</h4>
                      <p className="text-sm text-slate-600">Pick a motion, then table it.</p>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <button
                          type="button"
                          aria-pressed={!hasDobWritePerm && !hasCcWritePerm}
                          onClick={() => {
                            setHasDobWritePerm(false);
                            setHasCcWritePerm(false);
                            setHasChanges(true);
                          }}
                          className={`bg-white border border-slate-200 rounded-2xl h-full p-4 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-200 ${!hasDobWritePerm && !hasCcWritePerm ? "!border-indigo-500 ring-2 ring-indigo-100" : ""}`}
                        >
                          <span className="block font-semibold text-slate-900">Close submissions</span>
                          <span className="mt-3 block text-sm text-slate-600">Freeze both envelopes.</span>
                          {!hasDobWritePerm && !hasCcWritePerm && <span className="mt-3 block text-xs font-medium text-indigo-700">Selected</span>}
                        </button>
                        <button
                          type="button"
                          aria-pressed={hasCcReadPerm && !hasDobWritePerm && !hasCcWritePerm}
                          onClick={() => {
                            setHasCcReadPerm(true);
                            setHasDobWritePerm(false);
                            setHasCcWritePerm(false);
                            setHasChanges(true);
                          }}
                          className={`bg-white border border-slate-200 rounded-2xl h-full p-4 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-200 ${hasCcReadPerm && !hasDobWritePerm && !hasCcWritePerm ? "!border-indigo-500 ring-2 ring-indigo-100" : ""}`}
                        >
                          <span className="block font-semibold text-slate-900">Open financial envelopes</span>
                          <span className="mt-3 block text-sm text-slate-600">Open prices, close bidding.</span>
                          {hasCcReadPerm && !hasDobWritePerm && !hasCcWritePerm && <span className="mt-3 block text-xs font-medium text-indigo-700">Selected</span>}
                        </button>
                        <div className="space-y-3">
                          <button
                            type="button"
                            aria-pressed={hasDobWritePerm && hasCcWritePerm}
                            aria-describedby="extend-deadline-note"
                            onClick={() => {
                              setHasDobWritePerm(true);
                              setHasCcWritePerm(true);
                              setHasChanges(true);
                            }}
                            className={`bg-white border border-slate-200 rounded-2xl w-full p-4 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-200 ${hasDobWritePerm && hasCcWritePerm ? "!border-indigo-500 ring-2 ring-indigo-100" : ""}`}
                          >
                            <span className="block font-semibold text-slate-900">Extend deadline</span>
                            <span className="mt-3 block text-sm text-slate-600">Let Vendor A edit again.</span>
                            {hasDobWritePerm && hasCcWritePerm && <span className="mt-3 block text-xs font-medium text-indigo-700">Selected</span>}
                          </button>
                          <p id="extend-deadline-note" className="text-xs text-slate-500">Requires three committee signatures.</p>
                        </div>
                      </div>

                      <p className="text-sm text-slate-600" aria-live="polite" aria-atomic="true">
                        <span className="font-semibold">Motion preview: </span>
                        {motionPreview.length ? motionPreview.join(" · ") : "No envelope changes."}
                      </p>

                      <details className="bg-white border border-slate-200 rounded-2xl p-4">
                        <summary className="cursor-pointer text-sm font-semibold text-slate-600">Advanced: <code>_tide_*</code> roles</summary>
                        <div className="mt-4 space-y-6">

                      {/* Date of Birth */}
                      <div>
                        <label className="block font-semibold text-sm mb-1">{FIELDS.dob.en}</label>
                        <div className="flex gap-6">
                          <label className="flex items-center gap-2">
                            <input type="checkbox" name="dob.read" checked={hasDobReadPerm} onChange={e => setHasDobReadPerm(e.target.checked)}/>
                            <span>Open (read)</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" name="dob.write" checked={hasDobWritePerm} onChange={e => setHasDobWritePerm(e.target.checked)}/>
                            <span>Accept submissions (write)</span>
                          </label>
                        </div>
                      </div>

                      {/* Credit Card Number */}
                      <div>
                        <label className="block font-semibold text-sm mb-1">{FIELDS.cc.en}</label>
                        <div className="flex gap-6">
                          <label className="flex items-center gap-2">
                            <input type="checkbox" name="cc.read" checked={hasCcReadPerm} onChange={e => setHasCcReadPerm(e.target.checked)}/>
                            <span>Open (read)</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" name="cc.write" checked={hasCcWritePerm} onChange={e => setHasCcWritePerm(e.target.checked)}/>
                            <span>Accept submissions (write)</span>
                          </label>
                        </div>
                      </div>
                        </div>
                      </details>
                    </div>

                    <div className="flex items-center gap-x-2">
                      <Button className="rounded-full bg-indigo-600 text-white hover:bg-indigo-700" type="submit" disabled={!hasChanges || loadingOverlay}>Table motion</Button>
                      {
                        loadingOverlay
                        ? <div className="spinner--left"/>
                        : null
                      }
                    </div>
                  </form>

                  {requests[0] && (
                    <>
                      {/* Sub-heading + info toggle */}
                      <div className="relative mb-2">
                        <h3 className="text-xl font-semibold">Motions awaiting signatures</h3>
                        <p className="text-sm text-slate-600">You sign first; three signatures commit.</p>
                        <button
                          onClick={() => setShowChangeInfo(prev => !prev)}
                          className="rounded-full absolute -top-2 right-0 text-2xl hover:scale-110 transition-transform"
                          aria-label="Toggle motion explanation"
                        >
                          {showChangeInfo ? "🤯" : "🤔"}
                        </button>
                      </div>

                      {showChangeInfo && (
                        <AccordionBox
  title="How motions become rules"
  isOpen
>
  <ul className="list-disc pl-5 space-y-1">
    <li>Table a motion for committee signatures.</li>
    <li>Three signatures authorize the new rules.</li>
    <li>No insider can bypass quorum.</li>
    <li>Every signature leaves an audit trail.</li>
  </ul>
  <p className="text-sm text-slate-600 mt-2">
    <em>Review</em>, sign, then <strong>Commit</strong> after quorum.
  </p>
</AccordionBox>
                      )}
                      <div className="space-y-4">

                        {/* each draft as row */}
                        {requests.map((req, idx, i) => {
                          const isActive = idx === activeRequestIndex;
                          const isExpanded = idx === expandedIndex;

                          return (
                            <div
                              key={idx}
                              onClick={() => setExpandedIndex(idx)}
                              className={`
      cursor-pointer border rounded-2xl p-3
      ${isActive ? "!border-indigo-500 ring-2 ring-indigo-100 bg-indigo-50" : "border-slate-200 bg-white"}
      transition-colors
    `}
                            >
                              {/* ─── Header Row ───────────────────────────────────────── */}
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  {isActive && <FaChevronRight className="text-blue-500" />}
                                  <span className="font-medium">
                                    Motion: {req.role} permission
                                  </span>
                                </div>
                                {
                                  pending && activeRequestIndex === idx
                                  ?
                                  <span className={`
                                    px-2 py-1 rounded-full text-xs
                                    ${
                                      "bg-yellow-100 text-yellow-800" 
                                      }
                                  `}>
                                    {"PENDING"}
                                  </span> 
                                  :
                                  req.deleteStatus
                                  ?
                                  <span className={`
                                    px-2 py-1 rounded-full text-xs
                                    ${req.deleteStatus === "DRAFT" ? "bg-slate-100 text-slate-900" :
                                        req.deleteStatus === "APPROVED" ? "bg-green-100 text-green-800" :
                                          "bg-blue-100 text-blue-800"}
                                  `}>
                                    {req.deleteStatus}
                                  </span>
                                  :
                                  <span className={`
                                    px-2 py-1 rounded-full text-xs
                                    ${req.status === "DRAFT" ? "bg-slate-100 text-slate-900" :
                                        req.status === "APPROVED" ? "bg-green-100 text-green-800" :
                                          "bg-blue-100 text-blue-800"}
                                  `}>
                                    {req.status}
                                  </span>
                                }
                              </div>

                              {/* ─── Expanded Content ─────────────────────────────────── */}
                              {isExpanded && (
                                isActive
                                  ? <div className="mt-2">
                                    <QuorumDashboard
                                      request={req}
                                      onCommit={async () => await addCommit(req)}
                                    />
                                  </div>
                                  : <pre className="mt-2 bg-slate-50 border text-sm rounded-2xl p-4 overflow-auto">
                                    {req.userRecord[0].accessDraft}
                                  </pre>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        </div>
        <div className="h-10"></div>
        </main>
        : <LoadingSquareFullPage/>
    )
}
