"""Optional model export. Requires torch, torchvision, onnx and numpy.

Run from the repository root. Downloads public weights only; reads no photos.
"""
import urllib.request, pathlib, hashlib, torch, torch.nn as nn
from torchvision import models
import onnx, numpy as np
from onnx import numpy_helper, helper
root=pathlib.Path('.build-tools')
root.mkdir(exist_ok=True)
url='https://huggingface.co/VItaldob/text-type-classifier-resnet18/resolve/5709c25/resnet18_text_classifier_final.pth'
urllib.request.urlretrieve(url,root/'text-classifier.pth')
assert hashlib.sha256((root/'text-classifier.pth').read_bytes()).hexdigest() == '8e630733fc40e4a46956856e770222772bcde7f73724752708742eda96696834', 'Unexpected model weights'
model=models.resnet18(weights=None)
model.fc=nn.Linear(model.fc.in_features,2)
model.load_state_dict(torch.load(root/'text-classifier.pth',map_location='cpu',weights_only=True))
model.eval()
torch.onnx.export(model,torch.zeros(1,3,128,512),str(root/'text-classifier.onnx'),input_names=['pixels'],output_names=['logits'],opset_version=17,dynamo=False)
pathlib.Path('public/models').mkdir(exist_ok=True)
# Store large weights as int8, dequantize to float for portable WASM operators.
graph=onnx.load(str(root/'text-classifier.onnx'))
nodes=[]
for weight in list(graph.graph.initializer):
    a=numpy_helper.to_array(weight)
    if a.dtype!=np.float32 or a.size<100: continue
    scale=np.float32(max(np.max(np.abs(a))/127,1e-8))
    q=np.clip(np.round(a/scale),-127,127).astype(np.int8)
    graph.graph.initializer.remove(weight)
    graph.graph.initializer.extend([numpy_helper.from_array(q,weight.name+'_q'),numpy_helper.from_array(np.array(scale),weight.name+'_scale'),numpy_helper.from_array(np.array(0,dtype=np.int8),weight.name+'_zero')])
    nodes.append(helper.make_node('DequantizeLinear',[weight.name+'_q',weight.name+'_scale',weight.name+'_zero'],[weight.name]))
original=list(graph.graph.node); del graph.graph.node[:]; graph.graph.node.extend(nodes+original)
onnx.checker.check_model(graph)
onnx.save(graph,'public/models/text-type-resnet18.onnx')
print('Exported local browser classifier.')
