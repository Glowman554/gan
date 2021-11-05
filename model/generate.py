import matplotlib.pyplot as plt
import PIL
import numpy as np
import argparse

from common_args import apply_common_args
from model import load_latest

def generate_and_save_images(model, path, test_input, open = False):
	# Notice `training` is set to False.
	# This is so all layers run in inference mode (batchnorm).
	predictions = model(test_input, training=False)
	fig = plt.figure(figsize=(4, 4))

	for i in range(predictions.shape[0]):
		plt.subplot(5, 5, i+  1)    
		plt.imshow(np.array((predictions[i] + 127.5) * 127.5).astype(np.uint8))
		plt.axis('off')

	plt.savefig(path)

	if open == True:
		plt.show()
	else:
		plt.close()

def generate_and_save_to_file(model, path, test_input):
	# generate image with pil and save to file
	predictions = model(test_input, training=False)

	for i in range(predictions.shape[0]):
		img = PIL.Image.fromarray(np.array((predictions[i] + 127.5) * 127.5).astype(np.uint8))
		img.save(path + "/" + str(i) + '.png')


def main():
	parser = argparse.ArgumentParser()
	apply_common_args(parser)
	parser.add_argument('--path', type=str, default='generated_images', help='Path to save generated images')
	parser.add_argument('--count', type=int, default=10, help='Number of images to generate')
	parser.add_argument('--model_dir', type=str, default='models/', help='Path to model directory')
	parser.add_argument('--batch', action="store_true", help='Batch all generated images into 1 image')

	args = parser.parse_args()

	generator, discriminator = load_latest(args.img_width, args.img_height, args.img_channels, args.model_dir)

	if args.batch:
		generate_and_save_images(generator, args.path + "/batch.png", np.random.randn(100 * args.count).reshape(args.count, 100), True)
	else:
		generate_and_save_to_file(generator, args.path, np.random.randn(100 * args.count).reshape(args.count, 100))

if __name__ == '__main__':
	main()
	