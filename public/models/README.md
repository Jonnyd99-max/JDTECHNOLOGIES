# Text type detector

`text-type-resnet18.onnx` is an ONNX conversion of the MIT-licensed
[VItaldob/text-type-classifier-resnet18](https://huggingface.co/VItaldob/text-type-classifier-resnet18),
pinned to revision `5709c25`. Attribution: VItaldob / Zhnivo.

Classes: 0 handwritten, 1 printed. RGB crops are resized to 128×512 and normalized
with ImageNet mean/std. Large floating-point weights are stored as signed int8
with explicit DequantizeLinear nodes; inference uses portable float operators.
The converted file is 11,189,084 bytes. SHA-256:
`4f75079bc6860050a422aaef0b56187f0007bd10dbe6eec820121eb2b338d80c`.

This archival line-crop model is an experimental type estimate, not proof of
transcription accuracy. Tesseract localization can miss writing. No user images
or extracted text are included in this model. The optional conversion tool is
`scripts/export-text-classifier.py`; it requires torch, torchvision, onnx and numpy.

## MIT License

Copyright (c) VItaldob

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
