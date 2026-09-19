$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root = 'C:\CAPSTONE 2 (BACK-FRONT)'
$out = Join-Path $root 'output\paymongo'
$parts = [System.Collections.Generic.List[string]]::new()
function Para([string]$text, [string]$style='Normal') {
    if ($text.Contains('___') -and $style -eq 'Normal') { $style='Field' }; $escaped = [System.Security.SecurityElement]::Escape($text)
    $parts.Add("<w:p><w:pPr><w:pStyle w:val=`"$style`"/></w:pPr><w:r><w:t xml:space=`"preserve`">$escaped</w:t></w:r></w:p>")
}
function Page { $parts.Add('<w:p><w:r><w:br w:type="page"/></w:r></w:p>') }
Para 'PAYMONGO | BUSINESS ONBOARDING' 'Kicker'
Para 'Business information worksheet' 'Title'
Para 'Prepared for MCIDBMS / MARC | 19 September 2026' 'Subtitle'
Para 'Use this editable worksheet to prepare your answers. It is not an official PayMongo form or proof of business registration. Replace blanks and confirm every suggested answer before submitting.'
Para 'Confirm your actual business first' 'Heading1'
Para 'The application is branded MARC Interior Design, while its saved business notes describe Advertising Services. Your PayMongo industry and description must match what the registered business actually sells. The software project name does not establish the legal business name.'
Para 'Details available from your project' 'Heading2'
Para 'Application brand: MARC Interior Design (verify against registered trade name).'
Para 'Profile name: Marc Rossel P. Lecciones (confirm owner/representative role and exact ID spelling).'
Para 'Location: Placer, Masbate, Philippines (complete street/barangay address and postal code still needed).'
Para 'Contact in project notes: 09925280374 (confirm this is your customer-facing business number).'
Para 'Email shown in your IDE: lecciones20@gmail.com (confirm it is the intended merchant contact).'
Para 'Suggested description - choose and edit' 'Heading2'
Para 'If Advertising Services is correct: We provide advertising design services for agreed client projects. The scope, deliverables, schedule and price are confirmed with each client before payment. Clients use our online system to request services and pay agreed project charges through PayMongo-hosted GCash checkout.'
Para 'If Interior Design is correct: We provide interior design services for residential and commercial spaces. Project scope, schedule and price are agreed with each client before payment. Clients use our online system to request services and pay agreed project charges through PayMongo-hosted GCash checkout.'
Para 'These are draft descriptions, not confirmed service claims. Remove any activity you do not offer. Select the closest truthful category from PayMongo; do not invent an industry code.' 'Small'
Page
Para 'Business profile: fill these in' 'Title'
Para 'Copy names, registration details and tax information from your official records. Fields may vary by account and the live dashboard. [1, 2]' 'Subtitle'
Para 'Identity and registration' 'Heading1'
Para 'Legal business name: __________________________________________'
Para 'Registered trade / public business name: __________________________'
Para 'Entity type (e.g. sole proprietor, partnership, corporation, OPC): __________'
Para 'DTI / SEC registration number, if requested: ________________________'
Para 'Business TIN: ________________________________________________'
Para 'Tax classification / gross-remittance answer: ________________________'
Para 'Use your actual records for tax answers. Complete any declaration requested in the dashboard; do not guess the applicable classification.' 'Small'
Para 'Operations and expected collections' 'Heading1'
Para 'Industry / category: ____________________________________________'
Para 'Business description: __________________________________________'
Para '___________________________________________________________'
Para 'Date operations began / business age: ____________________________'
Para 'Business size (use dashboard options): ___________________________'
Para 'Physical store / office? If yes, location(s): __________________________'
Para 'Estimated monthly transaction count: _____________________________'
Para 'Estimated monthly collection amount (PHP): ________________________'
Para 'Typical payment amount (PHP), if asked: ___________________________'
Para 'Use realistic business estimates. An app minimum or calculator estimate is not evidence of your actual turnover.' 'Small'
Para 'Address and public contact' 'Heading1'
Para 'Unit / building / street / barangay: ________________________________'
Para 'City / municipality / province / postal code: _________________________'
Para 'Business email and phone: ______________________________________'
Para 'Public website / accepted business page URL: _______________________'
Page
Para 'People, documents and payouts' 'Title'
Para 'Prepare the documents for your actual entity type. PayMongo can request additional evidence; follow its current dashboard instructions. [1]' 'Subtitle'
Para 'Owner or authorized representative' 'Heading1'
Para 'Full legal name and position: ____________________________________'
Para 'Email / mobile: _______________________________________________'
Para 'Prepare your birth details, nationality, home address, nature of work and source of funds for identity verification. Have your original accepted government ID and camera ready for the liveness/face check. Enter sensitive details directly in PayMongo. [2]'
Para 'Authority to represent the business / beneficial owners, if requested: ______'
Para '___________________________________________________________'
Para 'Entity document checklist' 'Heading1'
Para 'Sole proprietor: BIR Certificate of Registration; DTI Registration Certificate.'
Para 'Partnership: BIR Certificate of Registration; SEC Certificate of Partnership; Articles of Partnership; notarized Partnership Resolution.'
Para 'Corporation: BIR Certificate of Registration; SEC Certificate of Incorporation; notarized By-Laws; Articles of Incorporation; latest General Information Sheet (GIS); notarized Secretary''s Certificate.'
Para 'One Person Corporation (OPC): BIR Certificate of Registration; SEC Certificate of Incorporation; Articles of Incorporation; Form of Appointment of Officers; notarized Secretary''s Certificate.'
Para 'Individual / not yet registered: do not claim a registration you do not have. For this app''s intended GCash flow, PayMongo''s current checklist requires a registered business type and the relevant approval. [3]'
Para 'Payout destination - when prompted' 'Heading1'
Para 'Bank / supported destination: ____________________________________'
Para 'Account-holder name: __________________________________________'
Para 'Account number: enter directly in PayMongo, not in a shared worksheet.'
Para 'Confirm wallet/payout eligibility and the permitted account-holder name with PayMongo. A contact phone number is not automatically a payout account. [1, 3]'
Page
Para 'Submission guide and sources' 'Title'
Para 'Use this worksheet beside the PayMongo dashboard. Do not upload it as a replacement for official registration or identity documents.' 'Subtitle'
Para 'Before you submit' 'Heading1'
Para 'Confirm names, business activity and owner before copying any suggested wording.'
Para 'Complete your profile, contact verification and identity checks. Enter the business fields and upload the document pack requested for your entity.'
Para 'Prepare a public, working website showing services, PHP pricing, Philippine address, contact details, and Terms, Privacy and Refund policies. Confirm any business-page alternative with PayMongo. Localhost/private profiles are unsuitable. [4]'
Para 'Confirm your actual deposit, delivery and refund policies before publishing them.'
Para 'Request GCash activation under Settings > Payment Methods after the required business verification/upgrade. Account activation alone does not establish GCash approval. [3]'
Para 'Respond to Action Required notices. Never put API keys, passwords or OTPs here.'
Para 'Final review record' 'Heading1'
Para 'Confirmed business activity: _____________________________________'
Para 'Reviewed by / date: ____________________________________________'
Para 'Missing information or documents: ________________________________'
Para '___________________________________________________________'
Para 'Official sources' 'Heading1'
Para 'Checked 19 September 2026. Follow the live dashboard for exact requirements.' 'Small'
Para '[1] PayMongo - Account setup (business fields and entity documents)' 'Small'
Para 'https://docs.paymongo.com/docs/account-settings-account-setup' 'Source'
Para '[2] PayMongo - Create your account (identity and business profile)' 'Small'
Para 'https://docs.paymongo.com/docs/get-started-create-your-account' 'Source'
Para '[3] PayMongo - Go-live checklist (GCash eligibility and payouts)' 'Small'
Para 'https://docs.paymongo.com/docs/get-started-go-live-checklist' 'Source'
Para '[4] PayMongo - Account troubleshooting (public presence)' 'Small'
Para 'https://docs.paymongo.com/docs/account-settings-troubleshooting' 'Source'

$styles = @'
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:spacing w:before="0" w:after="120" w:line="264" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:color w:val="243247"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="0" w:after="160"/></w:pPr><w:rPr><w:b/><w:sz w:val="44"/><w:color w:val="17365D"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="0" w:after="160"/></w:pPr><w:rPr><w:sz w:val="20"/><w:color w:val="586577"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:outlineLvl w:val="0"/><w:spacing w:before="320" w:after="160"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="2E74B5"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:outlineLvl w:val="1"/><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="2E74B5"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Small"><w:name w:val="Small"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="100" w:line="260" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="19"/><w:color w:val="586577"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Source"><w:name w:val="Source"/><w:basedOn w:val="Small"/><w:pPr><w:spacing w:after="90"/></w:pPr><w:rPr><w:sz w:val="17"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Kicker"><w:name w:val="Kicker"/><w:basedOn w:val="Small"/><w:rPr><w:b/><w:color w:val="2E74B5"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Field"><w:name w:val="Field"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="0" w:after="100" w:line="240" w:lineRule="auto"/></w:pPr></w:style></w:styles>
'@
$docx = Join-Path $out 'PayMongo_Business_Information_Worksheet.docx'
if (Test-Path -LiteralPath $docx) { Remove-Item -LiteralPath $docx }; $zip = [System.IO.Compression.ZipFile]::Open($docx, [System.IO.Compression.ZipArchiveMode]::Create)
function Part($name,$content) { $entry=$zip.CreateEntry($name); $writer=[System.IO.StreamWriter]::new($entry.Open(),[System.Text.UTF8Encoding]::new($false)); $writer.Write($content); $writer.Dispose() }
try {
Part '[Content_Types].xml' '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'
Part '_rels/.rels' '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
Part 'word/_rels/document.xml.rels' '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
Part 'word/styles.xml' $styles
Part 'word/document.xml' ('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+($parts -join '')+'<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708"/></w:sectPr></w:body></w:document>')
} finally { $zip.Dispose() }
Write-Output "Created $docx"
$word=New-Object -ComObject Word.Application
$word.Visible=$false
$word.DisplayAlerts=0
try {
 $doc=$word.Documents.Open($docx)
 $doc.Repaginate()
 Write-Output ('Pages: '+$doc.ComputeStatistics(2))
 $pdf=Join-Path $out 'PayMongo_Business_Information_Worksheet.pdf'
 $doc.ExportAsFixedFormat($pdf,17)
 Write-Output "Exported $pdf"
 $doc.Close(0)
} finally { try { $word.Quit() } catch {}; [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null }



