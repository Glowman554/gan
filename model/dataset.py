import numpy as np
from tqdm import tqdm
from PIL import Image
import argparse
import matplotlib.pyplot as plt
import os

from common_args import apply_common_args

def load_dataset(path):
	with np.load(path, allow_pickle=True) as f:
		print(f.files)
		x_train, y_train = f['x'], f['x']

		return (x_train, y_train)

def generate_dataset(path, img_folder, img_width, img_height, channels):
	x_train = []
	y_train = []

	for img_path in tqdm(os.listdir(img_folder)):
		#print("Loading image: {}".format(img_path))

		img = Image.open(img_folder + img_path)
		img = img.resize((img_width, img_height))

		# make tranparent background white
		img = img.convert("RGBA")
		datas = img.getdata()

		newData = []
		for item in datas:
			if item[0] == 0 and item[1] == 0 and item[2] == 0 and item[3] == 0:
				newData.append((255, 255, 255, 255))
			else:
				newData.append(item)
		img.putdata(newData)
		# ---------------------------------

		if channels == 1:
			img = img.convert('L')
		elif channels == 3:
			img = img.convert('RGB')
		elif channels == 4:
			img = img.convert('RGBA')
		else:
			raise Exception("Invalid number of channels")
		
		img = np.array(img)
		img = img.reshape(1, img_width, img_height, channels)

		x_train.append(img)

		label = img_path.split('_')[0]
		y_train.append(label)

	x_train = np.array(x_train)
	y_train = np.array(y_train)

	np.savez(path, x=x_train, y=y_train)

	return (x_train, y_train)

def plot_dataset(x_train, y_train):
	if x_train.shape[0] > 25:
		num_samples = 25
	else:
		num_samples = x_train.shape[0]

	for i in tqdm(range(num_samples)):
		plt.subplot(5, 5, i+1)  
		plt.imshow(x_train[i][0,:,:,:], cmap='gray')
		plt.axis('off')

	plt.show()

def main():
	parser = argparse.ArgumentParser()
	apply_common_args(parser)
	parser.add_argument('--dataset_path', type=str, default='dataset.npz', help='Path to the dataset')
	parser.add_argument('--img_folder', type=str, default='images/', help='Path to the images')

	args = parser.parse_args()

	x_train, y_train = generate_dataset(args.dataset_path, args.img_folder, args.img_width, args.img_height, args.img_channels)
	plot_dataset(x_train, y_train)

if __name__ == '__main__':
	main()
	