import requests
import os

path = os.getcwd()
new_path = path + '\\nft_photos\\advait_nft.jpg'
print(new_path)

url = "https://api.pinata.cloud/pinning/pinFileToIPFS"

payload={'pinataOptions': '{"cidVersion": 1}',
'pinataMetadata': '{"name": "MyFile", "keyvalues": {"company": "Pinata"}}'}
files=[
  ('file',('advait_nft.jpg',open(new_path,'rb'),'application/octet-stream'))
]

print('hello')

headers = {
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIxZTFjMGE2OS05OWE0LTQxZDktOWYxYy1kMWNhMjhiODMwN2EiLCJlbWFpbCI6ImF5YXRoYW4yMUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJpZCI6IkZSQTEiLCJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MX0seyJpZCI6Ik5ZQzEiLCJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MX1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiZjJiN2EwODdhODY3MWQ0OTE3OTQiLCJzY29wZWRLZXlTZWNyZXQiOiJhZWM3ZWRkZjVlZGEzNTk1NWNjMDlmYzA0Mjc5MTU2ZDcxODEwMWM4MDcyYjU0OTMxZDUyOTVkYzI3M2IyM2UyIiwiaWF0IjoxNjcxMDA4OTc5fQ.ntiu6kMk_ZSoMgSuHjwdO1wPcr-6tx55xhLIZDMxqZg'
}

response = requests.request("POST", url, headers=headers, data=payload, files=files)

print(response.text)
