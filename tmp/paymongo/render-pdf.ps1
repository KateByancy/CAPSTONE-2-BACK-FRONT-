$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null=[Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
$null=[Windows.Data.Pdf.PdfDocument,Windows.Data.Pdf,ContentType=WindowsRuntime]
$null=[Windows.Storage.Streams.InMemoryRandomAccessStream,Windows.Storage.Streams,ContentType=WindowsRuntime]
$null=[Windows.Storage.Streams.DataReader,Windows.Storage.Streams,ContentType=WindowsRuntime]
function Await($operation,[Type]$type) {
 $method=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
 $task=$method.MakeGenericMethod($type).Invoke($null,@($operation)); $task.Wait(); return $task.Result
}
$file=Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync('C:\CAPSTONE 2 (BACK-FRONT)\output\paymongo\PayMongo_Business_Information_Worksheet.pdf')) ([Windows.Storage.StorageFile])
$pdf=Await ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])
Write-Output ('PDF pages: '+$pdf.PageCount)
for($i=0;$i -lt $pdf.PageCount;$i++) {
 $page=$pdf.GetPage($i)
 $stream=[Windows.Storage.Streams.InMemoryRandomAccessStream]::new()
 $action=$page.RenderToStreamAsync($stream)
 $actionMethod=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and !$_.IsGenericMethod -and $_.GetParameters().Count -eq 1 }; $actionMethod.Invoke($null,@($action)).Wait()
 $reader=[Windows.Storage.Streams.DataReader]::new($stream.GetInputStreamAt(0))
 $null=Await ($reader.LoadAsync([uint32]$stream.Size)) ([uint32])
 $bytes=New-Object byte[] $stream.Size; $reader.ReadBytes($bytes)
 [System.IO.File]::WriteAllBytes(('C:\CAPSTONE 2 (BACK-FRONT)\tmp\paymongo\page-'+($i+1)+'.png'),$bytes)
 $reader.Dispose();$stream.Dispose();$page.Dispose()
}

