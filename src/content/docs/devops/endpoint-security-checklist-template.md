---


contentType: docs
slug: endpoint-security-checklist-template
title: "Endpoint Security Checklist Template"
description: "A checklist template for hardening laptops, workstations, and mobile devices that access corporate data and systems."
metaDescription: "Harden endpoints with this security checklist template. Covers encryption, MFA, patching, EDR, backups, and remote wipe policies."
difficulty: beginner
topics:
  - security
  - infrastructure
tags:
  - endpoint-security
  - device-hardening
  - mdm
  - edr
  - compliance
relatedResources:
  - /docs/container-security-baseline-template
  - /docs/network-segmentation-policy-template
  - /docs/secret-rotation-schedule-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Harden endpoints with this security checklist template. Covers encryption, MFA, patching, EDR, backups, and remote wipe policies."
  keywords:
    - endpoint security checklist
    - device hardening
    - mobile device management
    - endpoint detection and response
    - BYOD security


---

## Overview

Endpoint security is the practice of protecting devices that connect to an organization's network, including laptops, desktops, mobile phones, and tablets. This checklist template covers the minimum controls required to reduce the risk of malware, data loss, credential theft, and unauthorized access from employee devices.

## When to Use

- Onboarding a new employee or contractor.
- Issuing a corporate laptop or mobile device.
- Configuring a bring-your-own-device (BYOD) policy.
- Preparing for a compliance audit or security review.
- Investigating an endpoint compromise or lost device.

## Prerequisites

- A list of supported device types and operating systems.
- A mobile device management (MDM) or endpoint management tool.
- Approved software and hardware inventory.
- An endpoint detection and response (EDR) solution.
- A process for reporting lost, stolen, or compromised devices.

## Solution

### Checklist

#### 1. Device Configuration

- [ ] Operating system is supported and receiving security updates.
- [ ] Automatic OS updates are enabled.
- [ ] Screen locks after a short period of inactivity.
- [ ] Strong password, PIN, or biometric authentication is required.
- [ ] Full-disk encryption is enabled.
- [ ] Built-in firewall is enabled.
- [ ] Guest or unused accounts are disabled.
- [ ] Remote wipe capability is configured.
- [ ] Device is registered in the MDM or endpoint management console.
- [ ] Location services are disabled or restricted to business needs.

#### 2. Identity and Access

- [ ] Multi-factor authentication is enabled for all corporate accounts.
- [ ] Single sign-on (SSO) is used where possible.
- [ ] Local administrator privileges are restricted.
- [ ] Corporate credentials are not shared with personal accounts.
- [ ] Password manager is installed and configured.
- [ ] VPN or zero-trust client is required for remote access.

#### 3. Software and Applications

- [ ] Only approved software is installed.
- [ ] Application whitelisting or store restrictions are enforced.
- [ ] Antivirus or EDR agent is installed and active.
- [ ] Web browser is updated with security extensions enabled.
- [ ] Unused or default applications are removed.
- [ ] Auto-updates are enabled for all business applications.

#### 4. Network and Data Protection

- [ ] Public Wi-Fi access requires VPN.
- [ ] Bluetooth is disabled when not in use.
- [ ] USB and removable media use is restricted or monitored.
- [ ] Sensitive data is stored in approved cloud locations, not locally.
- [ ] Cloud sync services are restricted to corporate-approved tools.
- [ ] Backups are configured and encrypted.

#### 5. Monitoring and Incident Response

- [ ] EDR agent is reporting to the security team.
- [ ] Device compliance status is visible in the management console.
- [ ] Alerts for lost or stolen devices are configured.
- [ ] Users know how to report a lost device or suspected compromise.
- [ ] Offboarding process revokes access and wipes corporate data.

## Explanation

Endpoints are the first target for phishing, malware, and credential theft. A hardened device reduces the chance of compromise, while encryption and remote wipe protect data if the device is lost. Combining technical controls with user training creates a strong first line of defense.

## Variants

- Remote worker checklist: Adds VPN, home router security, and webcam privacy checks.
- BYOD checklist: Focuses on containerization and separation of personal vs. corporate data.
- Executive device checklist: Adds higher security layers, travel precautions, and dedicated support.
- Developer endpoint checklist: Adds secure code signing, container runtime security, and secrets management.
- Mobile-only checklist: Simplified controls for phones and tablets with app-level restrictions.

## What Works

- Apply the checklist before the device is used for work.
- Automate compliance checks through MDM or EDR policies.
- Review and update the checklist quarterly.
- Train users to recognize phishing and report suspicious activity.
- Require encryption for all devices that access sensitive data.
- Maintain an asset inventory linked to users and risk levels.
- Document exceptions with risk acceptance and expiration dates.

## Common Mistakes

- Allowing local administrator rights on all devices.
- Skipping encryption on devices that store customer data.
- Not updating the checklist for new operating system versions.
- Relying on antivirus alone without behavioral EDR monitoring.
- Ignoring personal devices that access corporate email.
- Not testing remote wipe procedures before an incident.
- Failing to revoke access during offboarding.

## FAQs

### What counts as an endpoint?

Any device that connects to corporate resources: laptops, desktops, smartphones, tablets, virtual desktops, and even IoT devices with access to the network.

### Should we encrypt BYOD devices?

Yes, if they store or access corporate data. Use mobile application management (MAM) or container solutions to separate corporate and personal data, and require encryption for the corporate profile.

### How do we enforce the checklist without slowing down users?

Use MDM profiles, group policy, or configuration management to automate as many controls as possible. Provide clear instructions and self-service recovery options to reduce friction.

## Advanced Solutions

### macOS hardening with Jamf Pro

Automate endpoint hardening for macOS fleets using Jamf Pro configuration profiles:

```bash
#!/bin/bash
set -euo pipefail

# Jamf Pro API authentication
JAMF_URL="https://yourorg.jamfcloud.com"
API_TOKEN=$(curl -s -X POST "$JAMF_URL/api/v1/auth/token" \
  -H "Content-Type: application/json" \
  -d '{"username":"api-user","password":"api-pass"}' | jq -r '.token')

# Apply FileVault encryption policy to all managed Macs
curl -s -X POST "$JAMF_URL/api/v1/mobile-device-command-files" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "commandName": "EnableFileVault",
    "mobileDeviceIds": [1, 2, 3, 4, 5]
  }'

# Verify FileVault status across fleet
curl -s -X GET "$JAMF_URL/api/v1/computers-inventory" \
  -H "Authorization: Bearer $API_TOKEN" | \
  jq -r '.results[] | {
    name: .name,
    filevault: .diskEncryptionFileVaultEnabled,
    os_version: .osVersion
  }'

# Enforce Gatekeeper and SIP via configuration profile
cat > gatekeeper-profile.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <dict>
    <key>spare-config-data</key>
    <dict>
      <key>Gatekeeper</key>
      <dict>
        <key>DeveloperIdentified</key>
        <true/>
      </dict>
    </dict>
  </dict>
  <key>PayloadDisplayName</key>
  <string>Gatekeeper Enforcement</string>
  <key>PayloadIdentifier</key>
  <string>com.company.gatekeeper</string>
  <key>PayloadType</key>
  <string>com.apple.ManagedClient.preferences</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>
EOF
```

### Windows endpoint hardening with Intune

Deploy security baselines to Windows 11 endpoints via Microsoft Intune:

```powershell
# Connect to Microsoft Graph
Connect-MgGraph -Scopes "DeviceManagementConfiguration.ReadWrite.All"

# Apply Windows 11 Security Baseline
$baseline = Get-MgDeviceManagementConfigurationPolicy |
  Where-Object { $_.Name -like "*Windows 11 Security*" }

# Verify compliance status across enrolled devices
$devices = Get-MgDeviceManagementManagedDevice
foreach ($device in $devices) {
    $compliance = Get-MgDeviceManagementManagedDeviceCompliancePolicyState `
      -ManagedDeviceId $device.Id

    Write-Output "$($device.DeviceName): $($compliance.State)"
}

# Check BitLocker encryption status
$bitlockerReport = Get-MgDeviceManagementManagedDevice |
  Select-Object DeviceName, @{
    Name="BitLockerStatus";
    Expression={ $_.EncryptionState -eq 1 ? "Encrypted" : "Not Encrypted" }
  }
$bitlockerReport | Format-Table
```

### Automated endpoint compliance scan with osquery

Run osquery to audit endpoint security posture across your fleet:

```sql
-- Check disk encryption status
SELECT
  de.encrypted,
  de.encrypted,
  hos.hostname,
  hos.os_version
FROM disk_encryption de
JOIN os_version hos
WHERE de.encrypted = 0;

-- Find devices with disabled firewall
SELECT
  pf.global_state,
  hos.hostname
FROM process_firewall pf
JOIN os_version hos
WHERE pf.global_state = 0;

-- Detect missing EDR agent
SELECT
  hos.hostname,
  p.name AS process_name
FROM processes p
JOIN os_version hos
WHERE p.name LIKE "%CrowdStrike%"
  OR p.name LIKE "%SentinelOne%"
  OR p.name LIKE "%Defender%"
GROUP BY hos.hostname
HAVING COUNT(*) = 0;

-- Find devices with USB storage enabled
SELECT
  hos.hostname,
  de.device,
  de.media_name
FROM disk_events de
JOIN os_version hos
WHERE de.action = "added"
  AND de.device LIKE "/dev/sd%";
```

## Additional Best Practices


- For a deeper guide, see [Data Retention Policy Template](/docs/data-retention-policy-template/).

1. **Implement zero-trust network access (ZTNA) for endpoints.** Replace traditional VPN with ZTNA to verify device posture before granting access. Devices that fail compliance checks are blocked automatically:

```yaml
# ZTNA policy: Block non-compliant devices
access_policy:
  name: "Endpoint compliance gate"
  conditions:
    - device.compliance_status == "compliant"
    - device.encryption_enabled == true
    - device.edr_reporting == true
  action: "allow"
  fallback_action: "block"
  fallback_message: "Device not compliant. Contact IT."
```

2. **Use hardware security keys for privileged users.** FIDO2 security keys (YubiKey, Titan) provide phishing-resistant MFA. Enforce them for admins and developers with production access:

```bash
# Enforce security key requirement via Okta API
curl -X POST "https://yourorg.okta.com/api/v1/policies" \
  -H "Authorization: SSWS $OKTA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "MFA_ENROLL",
    "name": "Security Key Required for Admins",
    "status": "ACTIVE",
    "priority": 1,
    "conditions": {
      "people": {
        "groups": {"include": ["admin-group-id"]}
      }
    },
    "settings": {
      "factors": [{"factorType": "security_key"}]
    }
  }'
```

## Additional Common Mistakes

1. **Not securing developer workstations with the same rigor as office laptops.** Developer machines often have SSH keys, cloud credentials, and production access. Apply the same EDR, encryption, and MFA requirements:

```bash
# Scan developer machines for exposed credentials
# Check for SSH keys without passphrase
find ~/.ssh -name "id_*" -not -name "*.pub" -exec ssh-keygen -y -f {} \; 2>&1 | \
  grep -q "Enter passphrase" || echo "WARNING: Key without passphrase: {}"

# Check for AWS credentials in plaintext
find ~/.aws -name "credentials" -exec chmod 600 {} \;
```

2. **Ignoring IoT and smart devices on the corporate network.** Smart TVs, conference room devices, and network printers often run unpatched firmware. Segment them into a dedicated VLAN with restricted access:

```bash
# Example: VLAN segmentation for IoT devices
# Switch configuration snippet
interface vlan 50
  description "IoT Devices - Restricted"
  ip access-group IoT_RESTRICTED in
!
ip access-list extended IoT_RESTRICTED
  permit tcp any any eq 443
  permit tcp any any eq 80
  deny ip any 10.0.0.0 0.255.255.255
  permit ip any any
```

## Additional Frequently Asked Questions

### How often should I audit endpoint compliance?

Run automated compliance checks weekly via MDM or EDR. Perform a full manual audit quarterly. After any security incident, re-audit all devices that may have been exposed.

### What is the difference between MDM and EDR?

MDM (Mobile Device Management) manages device configuration, policies, and lifecycle (enrollment, updates, remote wipe). EDR (Endpoint Detection and Response) monitors for threats, collects telemetry, and enables incident investigation. You need both: MDM for prevention, EDR for detection and response.
