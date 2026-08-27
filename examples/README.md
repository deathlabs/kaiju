## Planning the TTX 
**Step 1.** List the policies and plans the participants are being evaluated against.
* Incident Response Plan 

**Step 2.** Replace the list below with the TTX's objectives. 
* O1: Execute the new IRP to determine what needs to be updated
* O2: Educate the IRT on what needs to happen in the event of a intrusion
* O3: Identify what documentation needs to be written to make the IRP easier to execute
* O4: Ensure everyone on the IRT knows what their role is in the event of an incident

**Step 3.** Identify if this will be a "Discussion" or "Discussion and Hands-On" TTX.
* TTX Type: Discussion and Hands-On 

**Step 4.** Identify when the TTX will begin and end.
* TTX Start Time: 1300 EST 
* TTX End Time: 1500 EST 

**Step 5.** Fill-out the statement below. It will serve as the TTX's scenario.

At 0400 EST on 2026-02-26 (Friday), unknown anomalous outbound network activity was observed originating from the platform's Production environment.

**Step 6.** Identify each event that will occur during the TTX by filling-out the table below. 

This table will serve as the TTX's Master Scenario Event List (MSEL). 

| Event Number | Event Description | Expected Actions | Related Objectives |
|-------------|------------------|------------------|-------------------| 
| 1 | Detect | O-ISSM is notified, IRT is activated, initial triage is performed | O1, O2, O4 | 
| 2 | Respond | Containment and eradication procedures are performed according to the IRP | O1, O2, O3, O4 | 
| 3 | Recover | Recovery procedures are performed according to the IRP and the IRT prepares documentation for the incident AAR | O1, O2, O3, O4 | 

**Step 7.** Identify all the injects that occur during each event of the TTX. Acceptable values for the "Delivery Method" column are: index card, phone call, email, and chat message. This table will serve as the TTX's inject tracker. 

| Event Number | Inject Number | Scheduled Start Time | Delivery Method | From | To | Message | 
|-------------|---------------|---------------------|-----------------|------|----|---------| 
| 1 | 1A | 1305 | email | CSSP | ISSO | Hey team, we have observed unknown anomalous outbound reconnaissance traffic originating from the platform's Production environment that appears to be targeting the httpie, jsondevtool, and testmynids domains. This does not appear this is a benign event. The traffic patterns suggest reconnaissance activity, with numerous DNS queries and TCP connections being made. Please investigate on your end and notify us of your findings. We will need a systematic approach to best handle this situation. | | 2 | 2A | 1335 | chat message | Network Administrator | O-ISSM | Sir, the initial network review suggests the traffic is originating from the Kubernetes cluster, but the specific namespace and workload have not been identified yet. The team here is aggressively investigating this further. | 
| 2 | 2B | 1345 | chat message | CSSP | ISO | We have not received your plan of action for investigating and potentially responding? I'm just looking for an update. |
| 3 | 3A | 1415 | chat message | ISSO | O-ISSM | Sir, malware was found in one of the backend containers associated with the registrar workload. We also discovered their deployment code allowed all outbound traffic. We are in the process of examining the configuration settings of the workload to understand why this configuration was implemented and if it was intentional. | 
| 4 | 3B | 1440 | chat message | O-ISSM | CSSP | Sir, the team analyzed outbound traffic, did their code review, checked any third-party libraries or dependencies, and ran malware scans. | 
| 5 | 3C | 1445 | chat message | CSSP | O-ISSM | Thank you for your prompt and effective response to the recent security threat. You get a gold star for the day. | 

**Step 8.** List questions you, the TTX facilitator, can ask to stimulate discussion and achieve the TTX's objectives. 

| Question Number | Question | Expected Answer | 
|----------------|----------|-----------------| 
| 1 | What is your role when an incident is initially detected? | All roles are phase and role-dependent. Each member of the IRT needs to reference the IRP. | 
| 2 | What are reportable events? | Category 1 (Root Level Intrusion), Category 2 (User Level Intrusion), Category 4 (Denial of Service), Category 7 (Malware) | 
| 3 | Which stakeholders should be made aware of ths situation? | Unknown |
| 4 | Is there a need to segment parts of the network to contain the threat? | Most likely | 
| 5 | Is there a need to restore data from backups? | Depends on the impact | 
| 6 | What tools could be used to check the reputation of the domains and IP addresses? | Unknown | 
| 7 | What network monitoring tools could be use to perform deep packet inspections on the outbound traffic to identify any malicious payloads or patterns? | Unknown | 

## Preparing for the TTX 

**Step 1.** Coordinate with the Platform Team to ensure you (the TTX facilitator) and anyone performing in an "Opposing Forces" role have the access and technology required to execute each event (and all of their injects) in the Master Scenario Event List (MSEL). 

**Step 2.** Coordinate with the Information System Owner (ISO) to ensure the TTX is scheduled and all participants are invited. 

**Step 3.** Coordinate with the ISO to ensure all participants receive a copy of each of the security policies and incident response plans they will be evaluated on. 

## Executing the TTX 

While following the instructions below, refer to your TTX's plan. For example, instead of literally reading out loud placeholder text like <LIST OF SECURITY POLICIES AND INCIDENT RESPONSE PLANS>, you would say "Incident Response Policy and Incident Response Plans" if these are in your TTX's plan. 

**Step 1.** Read the following statement to the participants.

> Good afternoon everyone, We are conducting this tabletop exercise to validate your understanding and ability to execute organization's Incident Response Plan and policies within. This exercise will be Discussion and Hands-On based. It will begin at 1300 and last until 1500. The exercise is designed to: execute the new IRP to determine what needs to be updated, educate the IRT on what needs to happen in the event of a intrusion, identify what documentation needs to be written to make the IRP easier to execute, and ensure everyone on the IRT knows what their role is in the event of an incident. You are allowed to use whatever material you need to participate in the TTX, respond to events or injects, and answer question posed by the TTX facilitator.

**Step 2.** Read your TTX's scenario. 

**Step 3.** Guide the participants through each event and inject listed in your TTX's Master Scenario Event List (MSEL). As necessary, ask probing questions. 

## Assessing the TTX 

**Step 1.** Do the tasks listed below to produce an After-Action Review (AAR) document. 

### Summary 

Copy/paste the scenario text here. 

### Objectives 

Copy/paste the objectives here. 

### Facilitator Information 

Add your name and email address. 

### Participant Information 

Add the roles, names, and contact information for each participant here. 

### Master Scenario Event List 

Copy/paste data the "MSEL table" here. 

### Inject Tracker 

Copy/paste data from "inject table" here. 

### Sustainments 

Collect input from the participants on what should be sustained and list their comments here. 

### Improvements 

**Step 1.** Collect input from the participants on what should be improved and list their comments here. 

**Step 2.** Convert the AAR document to PDF and archive for future audits. 
