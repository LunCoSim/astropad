# Clanker v4 Feature Integration Plan for Astropad

_Last updated: [fill in date]_  

## Overview
This document tracks the integration of all Clanker v4 features (and subfeatures) into the Astropad application, their current status, and next steps. **All features must be designed with clear, intuitive UI and user-friendly explanations.**

---

## Fee Routing Requirement (Critical)
- **A portion of all protocol/LP fees must go to LunCo's wallet.**
- This must be enforced at the contract and UI level.
- UI must clearly show the LunCo fee share in all fee breakdowns.

---

## Feature Matrix

| Feature/Parameter                | Subfeatures/Details                                                                 | Status             | Notes/Next Steps                         |
|----------------------------------|------------------------------------------------------------------------------------|--------------------|-------------------------------------------|
| **Presale Extension**            | - minEthGoal, maxEthGoal, presaleDuration, recipient<br>- Lockup/vesting for presale<br>- User buy/claim UI<br>- Admin controls<br>- Presale status tracking | **Missing**        | Add presale setup/participation UI        |
| **MEV Module Config**            | - Enable/disable<br>- Block delay<br>- Custom module address<br>- Custom module data<br>- UI for all MEV module params | **Partial**        | Add custom module/data fields             |
| **Pool/Hook Config**             | - Static/dynamic fee selection<br>- All dynamic/static fee params (baseFee, maxFee, etc.)<br>- Custom poolData (bytes)<br>- UI for all hook params | **Partial**        | Expose all fee/hook/poolData params       |
| **LockerConfig**                 | - Custom positions (tickLower, tickUpper, positionBps)<br>- Locker address<br>- lockerData (bytes)<br>- rewardAdmins, rewardRecipients, rewardBps | **Partial**        | Add locker address/data/admin config      |
| **Extension Advanced Data**      | - Custom extensionData (bytes)<br>- msgValue per extension<br>- UI for all extension params | **Partial**        | Add extensionData/msgValue fields         |
| **TokenConfig Advanced**         | - salt (for deterministic/vanity deploy)<br>- Arbitrary context fields<br>- UI for all token config params | **Partial**        | Add salt/arbitrary context fields         |
| **Admin Features**               | - Enable/disable hooks, lockers, extensions, MEV modules<br>- Team fee recipient config<br>- Claim team fees<br>- Post-deployment management UI | **Missing**        | Add admin dashboard for management        |
| **LunCo Fee Routing**            | - Fee collector address<br>- Fee share %<br>- UI display<br>- Contract enforcement | **Missing**        | Must be implemented everywhere            |

---

## Next Steps
1. **Presale Extension:**
   - Design UI for presale setup (all parameters, user buy/claim, admin controls).
   - Integrate with backend and contract logic.
2. **MEV Module:**
   - Add advanced config for custom module address/data.
   - Expose all MEV module parameters in UI.
3. **Pool/Hook Config:**
   - Expose all static/dynamic fee parameters.
   - Allow custom poolData input.
4. **LockerConfig:**
   - Add UI for locker address, lockerData, rewardAdmins/recipients.
5. **Extension Advanced Data:**
   - Add UI for extensionData and msgValue per extension.
6. **TokenConfig Advanced:**
   - Add UI for salt and arbitrary context fields.
7. **Admin Features:**
   - Build admin dashboard for post-deployment management.
8. **LunCo Fee Routing:**
   - Implement fee routing to LunCo's wallet in contract and UI.
   - Show LunCo's share in all fee breakdowns.

---

## Notes
- Each feature/subfeature must have a user-friendly explanation in the UI (tooltips, info modals, etc.).
- This document should be updated as features are implemented or requirements change. 