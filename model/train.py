import argparse
from common_args import apply_common_args
from model import generator_model, discriminator_model, load_latest
from generate import generate_and_save_images
import tensorflow as tf
import time
import os
from tqdm import tqdm
from dataset import load_dataset

@tf.function
def train_step(images, generator, discriminator, generator_loss, discriminator_loss, generator_optimizer, discriminator_optimizer, batch_size):
	noise = tf.random.normal([batch_size, 100])

	with tf.GradientTape() as gen_tape, tf.GradientTape() as disc_tape:
		generated_images = generator(noise, training=True)

		real_output = discriminator(images, training=True)
		fake_output = discriminator(generated_images, training=True)
		
		gen_loss = generator_loss(fake_output)
		disc_loss = discriminator_loss(real_output, fake_output)
		
		
	gradients_of_gen = gen_tape.gradient(gen_loss, generator.trainable_variables) # computing the gradients
	gradients_of_disc = disc_tape.gradient(disc_loss, discriminator.trainable_variables) # computing the gradients
	
	generator_optimizer.apply_gradients(zip(gradients_of_gen, generator.trainable_variables)) # updating generator parameter 
	discriminator_optimizer.apply_gradients(zip(gradients_of_disc,discriminator.trainable_variables)) # updating discriminator parameter

def train(dataset, epochs, generator, discriminator, generator_loss, discriminator_loss, generator_optimizer, discriminator_optimizer,  model_dir, save_interval, sample_interval, batch_size):
	num_examples_to_generate = 25
	seed = tf.random.normal([num_examples_to_generate, 100])

	for epoch in range(epochs):
		start = time.time()
		for image_batch in tqdm(dataset):
			train_step(image_batch, generator, discriminator, generator_loss, discriminator_loss, generator_optimizer, discriminator_optimizer, batch_size)


		# Save the model every 50 epochs
		if (epoch + 1) % save_interval == 0:
			if os.path.exists(model_dir) == False:
				os.mkdir(model_dir)
			generator.save_weights(model_dir + "/generator_model_%d.h5" % (epoch + 1))
			discriminator.save_weights(model_dir + "/discriminator_model_%d.h5" % (epoch + 1))

			print("Saved generator to generator_model_%d.h5" % (epoch + 1))
			print("Saved discriminator to discriminator_model_%d.h5" % (epoch + 1))
		
		if (epoch + 1) % sample_interval == 0:
			generate_and_save_images(generator, "image.png", seed)

		print('Time for epoch {} is {} sec'.format(epoch + 1, time.time() - start))

def main():
	parser = argparse.ArgumentParser()
	apply_common_args(parser)
	parser.add_argument('--model_dir', type=str, default='models/', help='Directory to save model files.')
	parser.add_argument('--batch_size', type=int, default=32, help='Batch size for training.')
	parser.add_argument('--num_epochs', type=int, default=100, help='Number of epochs to train for.')
	parser.add_argument('--save_interval', type=int, default=100, help='Number of epochs between saving model.')
	parser.add_argument('--sample_interval', type=int, default=100, help='Number of epochs between sampling.')
	parser.add_argument('--restore', action='store_true', help='Set to true to restore model.')
	parser.add_argument('--dataset', type=str, default='dataset.npz', help='Dataset to use.')

	args = parser.parse_args()

	if args.restore:
		generator, discriminator = load_latest(args.img_width, args.img_height, args.img_channels, args.model_dir)

		generator.summary()
		discriminator.summary()
	else:
		generator = generator_model(args.img_width, args.img_height, args.img_channels)
		discriminator = discriminator_model(args.img_width, args.img_height, args.img_channels)
	
	binary_cross_entropy = tf.keras.losses.BinaryCrossentropy()

	def generator_loss(fake_output):
		gen_loss = binary_cross_entropy(tf.ones_like(fake_output), fake_output)
		return gen_loss

	def discriminator_loss(real_output, fake_output):
		real_loss = binary_cross_entropy(tf.ones_like(real_output), real_output)
		fake_loss = binary_cross_entropy(tf.zeros_like(fake_output), fake_output)
		total_loss = real_loss + fake_loss
		return total_loss
	
	generator_optimizer = tf.keras.optimizers.Adam()
	discriminator_optimizer = tf.keras.optimizers.Adam()

	x_train, y_train = load_dataset(args.dataset)
	x_train = x_train.reshape(x_train.shape[0], args.img_width, args.img_height, args.img_channels).astype('float32')
	x_train = (x_train - 127.5) / 127.5

	train_dataset = tf.data.Dataset.from_tensor_slices(x_train).shuffle(60000).batch(args.batch_size)

	train(train_dataset, args.num_epochs, generator, discriminator, generator_loss, discriminator_loss, generator_optimizer, discriminator_optimizer, args.model_dir, args.save_interval, args.sample_interval, args.batch_size)

if __name__ == '__main__':
	main()
	